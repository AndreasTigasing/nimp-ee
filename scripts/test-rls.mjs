/*
 * Security regression test for the database (Row Level Security + grants).
 *
 * Runs against a LOCAL Supabase stack — never point it at production: it
 * creates and deletes test users and rows.
 *
 *   npx supabase start
 *   npx supabase db reset      # clean database + demo seed
 *   npm run test:rls
 *
 * Connection details are read from `npx supabase status`; override with the
 * SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY env variables.
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { after, before, describe, test } from 'node:test'
import { createClient } from '@supabase/supabase-js'

function localStatus() {
  try {
    const raw = execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(raw.slice(raw.indexOf('{')))
  } catch {
    return {}
  }
}

const status = process.env.SUPABASE_URL ? {} : localStatus()
const url = process.env.SUPABASE_URL ?? status.API_URL
const anonKey = process.env.SUPABASE_ANON_KEY ?? status.ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  console.error('Local Supabase is not running. Start it with: npx supabase start')
  process.exit(1)
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) && !process.env.ALLOW_REMOTE_RLS_TEST) {
  console.error(`Refusing to run against a non-local database: ${url}`)
  process.exit(1)
}

const options = { auth: { persistSession: false, autoRefreshToken: false } }
const newClient = (key) => createClient(url, key, options)

const service = newClient(serviceKey)
const anon = newClient(anonKey)
const member = newClient(anonKey) // signed in, but NOT an admin
const admin = newClient(anonKey) // signed in and listed in admin_users

const runId = Date.now().toString(36)
const password = `Test-${runId}-pw!`
const memberEmail = `member-${runId}@rls-test.local`
const adminEmail = `admin-${runId}@rls-test.local`
const senderEmail = `sender-${runId}@rls-test.local`
const createdUserIds = []

const hour = 60 * 60 * 1000
const inHours = (hours) => new Date(Date.now() + hours * hour).toISOString()

async function createUser(email) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  assert.ifError(error)
  createdUserIds.push(data.user.id)
  return data.user.id
}

async function clearContactData() {
  await service.from('contact_submissions').delete().like('email', '%@rls-test.local')
  await service.from('contact_rate_log').delete().gte('id', 0)
}

/** Fixture rows covering every visibility state. */
let fixtures

/** The settings row as it was before the run; restored afterwards. */
let originalSettings

before(async () => {
  await createUser(memberEmail)
  const adminId = await createUser(adminEmail)
  assert.ifError((await service.from('admin_users').insert({ user_id: adminId })).error)

  assert.ifError((await member.auth.signInWithPassword({ email: memberEmail, password })).error)
  assert.ifError((await admin.auth.signInWithPassword({ email: adminEmail, password })).error)

  const offer = (overrides) => ({
    title: `RLS ${runId}`,
    brand_name: 'RLS Test',
    ...overrides,
  })
  // defaultToNull: false → columns missing from a row take their column default.
  const { data: offers, error: offersError } = await service
    .from('offers')
    .insert(
      [
        offer({ title: `RLS live ${runId}` }),
        offer({ title: `RLS inactive ${runId}`, is_active: false }),
        offer({ title: `RLS expired ${runId}`, valid_until: inHours(-1) }),
        offer({
          title: `RLS expired-kept ${runId}`,
          valid_until: inHours(-1),
          show_after_expiry: true,
        }),
        offer({ title: `RLS scheduled ${runId}`, valid_from: inHours(24) }),
        offer({ title: `RLS archived ${runId}`, archived_at: inHours(-1) }),
      ],
      { defaultToNull: false },
    )
    .select()
  assert.ifError(offersError)

  const { data: events, error: eventsError } = await service
    .from('calendar_events')
    .insert(
      [
        { title: `RLS visible ${runId}`, start_at: inHours(48) },
        { title: `RLS hidden ${runId}`, start_at: inHours(48), is_visible: false },
      ],
      { defaultToNull: false },
    )
    .select()
  assert.ifError(eventsError)

  fixtures = { offers, events }
  originalSettings = (await service.from('site_settings').select('*').single()).data
  await clearContactData()
})

after(async () => {
  await service.from('offers').delete().like('title', `RLS %${runId}`)
  await service.from('calendar_events').delete().like('title', `RLS %${runId}`)
  await clearContactData()
  if (originalSettings) {
    const { id: _id, updated_at: _updatedAt, ...columns } = originalSettings
    await service.from('site_settings').update(columns).eq('id', true)
  }
  for (const id of createdUserIds) await service.auth.admin.deleteUser(id)
})

const titles = (rows) => rows.map((row) => row.title.replace(` ${runId}`, '')).sort()
const mine = (query) => query.like('title', `RLS %${runId}`)

for (const [label, client] of [
  ['anonymous visitor', anon],
  ['signed-in non-admin', member],
]) {
  describe(label, () => {
    test('sees only live offers', async () => {
      for (const table of ['offers', 'live_offers']) {
        const { data, error } = await mine(client.from(table).select('title'))
        assert.ifError(error)
        assert.deepEqual(titles(data), ['RLS expired-kept', 'RLS live'], table)
      }
    })

    test('sees only visible calendar events', async () => {
      const { data, error } = await mine(client.from('calendar_events').select('title'))
      assert.ifError(error)
      assert.deepEqual(titles(data), ['RLS visible'])
    })

    test('cannot create, change or delete offers', async () => {
      const live = fixtures.offers.find((row) => row.title.startsWith('RLS live'))

      const insert = await client.from('offers').insert({ title: 'Hacked', brand_name: 'X' })
      assert.ok(insert.error, 'insert must fail')

      await client.from('offers').update({ title: 'Hacked' }).eq('id', live.id)
      await client.from('offers').delete().eq('id', live.id)

      const { data } = await service.from('offers').select('title').eq('id', live.id).single()
      assert.equal(data.title, live.title, 'offer must be unchanged')
    })

    test('cannot create, change or delete calendar events', async () => {
      const visible = fixtures.events.find((row) => row.title.startsWith('RLS visible'))

      const insert = await client
        .from('calendar_events')
        .insert({ title: 'Hacked', start_at: inHours(1) })
      assert.ok(insert.error, 'insert must fail')

      await client.from('calendar_events').update({ title: 'Hacked' }).eq('id', visible.id)
      await client.from('calendar_events').delete().eq('id', visible.id)

      const { data } = await service
        .from('calendar_events')
        .select('title')
        .eq('id', visible.id)
        .single()
      assert.equal(data.title, visible.title, 'event must be unchanged')
    })

    test('can read site settings but not change them', async () => {
      const read = await client.from('site_settings').select('*')
      assert.ifError(read.error)
      assert.equal(read.data.length, 1)

      await client.from('site_settings').update({ display_name: 'Hacked' }).eq('id', true)
      const { data } = await service.from('site_settings').select('display_name').single()
      assert.notEqual(data.display_name, 'Hacked')
    })

    test('cannot read contact submissions, the rate log or the admin list', async () => {
      const submissions = await client.from('contact_submissions').select('*')
      assert.ok(submissions.error || submissions.data.length === 0)

      const rateLog = await client.from('contact_rate_log').select('*')
      assert.ok(rateLog.error || rateLog.data.length === 0)

      const admins = await client.from('admin_users').select('*')
      assert.ok(admins.error || admins.data.length === 0)
    })

    test('is not an admin and cannot make itself one', async () => {
      const { data, error } = await client.rpc('is_admin')
      assert.ifError(error)
      assert.equal(data, false)

      const { data: session } = await client.auth.getSession()
      const userId = session.session?.user.id ?? createdUserIds[0]
      const grant = await client.from('admin_users').insert({ user_id: userId })
      assert.ok(grant.error, 'self-promotion must fail')
    })

    test('cannot use the first-run setup once an admin exists', async () => {
      const required = await client.rpc('setup_required')
      assert.ifError(required.error)
      assert.equal(required.data, false)

      // Anonymous callers are not even allowed to call it; signed-in ones are refused.
      const claim = await client.rpc('claim_first_admin', { code: 'ANYTHING' })
      assert.ok(claim.error || claim.data === 'already_done', 'claim must be refused')

      const code = await client.from('setup_state').select('*')
      assert.ok(code.error || code.data.length === 0, 'setup code must not be readable')

      const { data } = await client.rpc('is_admin')
      assert.equal(data, false)
    })

    test('cannot upload to the media bucket', async () => {
      const file = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], {
        type: 'image/svg+xml',
      })
      const { error } = await client.storage.from('media').upload(`site/hack-${runId}.svg`, file)
      assert.ok(error, 'upload must fail')
    })
  })
}

describe('contact form (anonymous)', () => {
  const valid = {
    name: 'Test Sender',
    company: 'Test OÜ',
    email: senderEmail,
    message: 'Tere! See on automaattesti sõnum.',
  }

  test('rejects invalid data', async () => {
    const cases = {
      'short message': { ...valid, message: 'liiga' },
      'bad e-mail': { ...valid, email: 'not-an-email' },
      'short name': { ...valid, name: ' ' },
    }
    for (const [name, payload] of Object.entries(cases)) {
      const { error } = await anon.from('contact_submissions').insert(payload)
      assert.ok(error, `${name} must be rejected`)
    }
  })

  test('cannot set server-controlled fields', async () => {
    for (const extra of [
      { status: 'read' },
      { notes: 'injected' },
      { created_at: inHours(-999) },
    ]) {
      const { error } = await anon.from('contact_submissions').insert({ ...valid, ...extra })
      assert.ok(error, `${Object.keys(extra)[0]} must be rejected`)
    }
  })

  test('accepts a valid submission, normalises it, then rate-limits the sender', async () => {
    const messy = { ...valid, name: '  Test Sender  ', email: `  ${senderEmail.toUpperCase()} ` }
    assert.ifError((await anon.from('contact_submissions').insert(messy)).error)
    assert.ifError((await anon.from('contact_submissions').insert(valid)).error)
    assert.ifError((await anon.from('contact_submissions').insert(valid)).error)

    const fourth = await anon.from('contact_submissions').insert(valid)
    assert.ok(fourth.error, 'fourth submission within the hour must be rejected')
    assert.equal(fourth.error.code, 'PT429')
    assert.equal(fourth.status, 429)

    const { data } = await service
      .from('contact_submissions')
      .select('name, email, status, notes')
      .eq('email', senderEmail)
    assert.equal(data.length, 3)
    assert.deepEqual(data[0], {
      name: 'Test Sender',
      email: senderEmail,
      status: 'new',
      notes: null,
    })
  })
})

describe('admin', () => {
  test('is recognised as admin', async () => {
    const { data, error } = await admin.rpc('is_admin')
    assert.ifError(error)
    assert.equal(data, true)
  })

  test('sees every offer but the public view still shows only live ones', async () => {
    const all = await mine(admin.from('offers').select('title'))
    assert.ifError(all.error)
    assert.equal(all.data.length, 6)

    const live = await mine(admin.from('live_offers').select('title'))
    assert.ifError(live.error)
    assert.deepEqual(titles(live.data), ['RLS expired-kept', 'RLS live'])
  })

  test('can create, update, archive and delete an offer', async () => {
    const created = await admin
      .from('offers')
      .insert({
        title: `RLS crud ${runId}`,
        brand_name: 'RLS Test',
        cta_url: 'https://example.com',
      })
      .select()
      .single()
    assert.ifError(created.error)

    const updated = await admin
      .from('offers')
      .update({ archived_at: new Date().toISOString(), promo_code: 'CODE' })
      .eq('id', created.data.id)
      .select()
      .single()
    assert.ifError(updated.error)
    assert.equal(updated.data.promo_code, 'CODE')
    assert.ok(updated.data.updated_at >= created.data.updated_at)

    const removed = await admin.from('offers').delete().eq('id', created.data.id).select()
    assert.ifError(removed.error)
    assert.equal(removed.data.length, 1)
  })

  test('cannot store unsafe links or invalid ranges', async () => {
    const base = { title: `RLS bad ${runId}`, brand_name: 'RLS Test' }
    const cases = {
      'javascript: link': { ...base, cta_url: 'javascript:alert(1)' },
      'data: image': { ...base, image: 'data:image/svg+xml,<svg/>' },
      'inverted validity': { ...base, valid_from: inHours(2), valid_until: inHours(1) },
    }
    for (const [name, payload] of Object.entries(cases)) {
      const { error } = await admin.from('offers').insert(payload)
      assert.ok(error, `${name} must be rejected`)
    }
  })

  test('can create, hide and delete a calendar event', async () => {
    const created = await admin
      .from('calendar_events')
      .insert({ title: `RLS crud ${runId}`, start_at: inHours(5), end_at: inHours(7) })
      .select()
      .single()
    assert.ifError(created.error)

    const hidden = await admin
      .from('calendar_events')
      .update({ is_visible: false })
      .eq('id', created.data.id)
      .select()
      .single()
    assert.ifError(hidden.error)
    assert.equal(hidden.data.is_visible, false)

    const removed = await admin.from('calendar_events').delete().eq('id', created.data.id).select()
    assert.ifError(removed.error)
    assert.equal(removed.data.length, 1)
  })

  test('can read and triage submissions but not rewrite them', async () => {
    const list = await admin.from('contact_submissions').select('*').eq('email', senderEmail)
    assert.ifError(list.error)
    assert.equal(list.data.length, 3)
    const target = list.data[0]

    const triaged = await admin
      .from('contact_submissions')
      .update({ status: 'read', notes: 'Vastatud.' })
      .eq('id', target.id)
      .select()
      .single()
    assert.ifError(triaged.error)
    assert.equal(triaged.data.status, 'read')

    const rewrite = await admin
      .from('contact_submissions')
      .update({ message: 'Rewritten by admin' })
      .eq('id', target.id)
    assert.ok(rewrite.error, 'sender-provided fields must be immutable')

    const invalid = await admin
      .from('contact_submissions')
      .update({ status: 'bogus' })
      .eq('id', target.id)
    assert.ok(invalid.error, 'unknown status must be rejected')

    const removed = await admin.from('contact_submissions').delete().eq('id', target.id).select()
    assert.ifError(removed.error)
    assert.equal(removed.data.length, 1)
  })

  test('can update site settings (and only with valid values)', async () => {
    const saved = await admin
      .from('site_settings')
      .update({ tagline: `RLS ${runId}`, theme_primary: '#112233' })
      .eq('id', true)
      .select()
      .single()
    assert.ifError(saved.error)
    assert.equal(saved.data.theme_primary, '#112233')

    const invalid = await admin
      .from('site_settings')
      .update({ theme_primary: 'red' })
      .eq('id', true)
    assert.ok(invalid.error, 'invalid colour must be rejected')

    const layout = await admin
      .from('site_settings')
      .update({ section_order: ['offers', 'about'], hidden_sections: ['twitch'] })
      .eq('id', true)
      .select()
      .single()
    assert.ifError(layout.error)
    assert.deepEqual(layout.data.section_order, ['offers', 'about'])

    const unknownSection = await admin
      .from('site_settings')
      .update({ section_order: ['offers', 'not-a-section'] })
      .eq('id', true)
    assert.ok(unknownSection.error, 'unknown section ids must be rejected')

    const second = await admin.from('site_settings').insert({ id: false })
    assert.ok(second.error, 'a second settings row must be impossible')
    // The settings row is put back to its original state in after().
  })

  test('can upload an image that is then publicly readable', async () => {
    const path = `site/rls-${runId}.svg`
    const file = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'], {
      type: 'image/svg+xml',
    })
    const bucket = admin.storage.from('media')

    const upload = await bucket.upload(path, file, { contentType: 'image/svg+xml' })
    assert.ifError(upload.error)

    const response = await fetch(bucket.getPublicUrl(path).data.publicUrl)
    assert.equal(response.status, 200)

    const wrongType = await bucket.upload(`site/rls-${runId}.html`, new Blob(['<html>']), {
      contentType: 'text/html',
    })
    assert.ok(wrongType.error, 'non-image uploads must be rejected')

    assert.ifError((await bucket.remove([path])).error)
  })

  test('manages admins through invitations', async () => {
    const listed = await admin.rpc('list_admins')
    assert.ifError(listed.error)
    const self = listed.data.find((row) => row.email === adminEmail)
    assert.equal(self?.is_self, true)

    // Non-admins cannot see admins, create invitations or remove anyone.
    for (const client of [anon, member]) {
      assert.ok((await client.rpc('list_admins')).error, 'list_admins must be admin only')
      assert.ok((await client.rpc('create_admin_invite')).error, 'inviting must be admin only')
      assert.ok((await client.rpc('list_admin_invites')).error, 'invites must be admin only')
      assert.ok((await client.rpc('remove_admin', { target: self.user_id })).error)
      const direct = await client.from('admin_invites').select('*')
      assert.ok(direct.error || direct.data.length === 0, 'invites table must be unreachable')
    }

    // An invitation bound to another address is useless to this member.
    const foreign = await admin.rpc('create_admin_invite', {
      invite_email: `other-${runId}@rls-test.local`,
      valid_days: 1,
    })
    assert.ifError(foreign.error)
    assert.match(foreign.data, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/)
    assert.equal(
      (await member.rpc('accept_admin_invite', { code: foreign.data })).data,
      'wrong_email',
    )
    assert.equal(
      (await member.rpc('accept_admin_invite', { code: 'AAAA-BBBB-CCCC-DDDD' })).data,
      'invalid_code',
    )
    assert.ok(
      (await anon.rpc('accept_admin_invite', { code: foreign.data })).error,
      'anon cannot accept',
    )
    assert.equal((await member.rpc('is_admin')).data, false)

    // An expired invitation is refused.
    const stale = await admin.rpc('create_admin_invite', { invite_email: memberEmail })
    await service
      .from('admin_invites')
      .update({ expires_at: inHours(-1) })
      .eq('email', memberEmail)
    assert.equal((await member.rpc('accept_admin_invite', { code: stale.data })).data, 'expired')

    // A valid one works — in lower case, without dashes — exactly once.
    const invite = await admin.rpc('create_admin_invite', {
      invite_email: memberEmail.toUpperCase(),
    })
    const typed = invite.data.replaceAll('-', '').toLowerCase()
    assert.equal((await member.rpc('accept_admin_invite', { code: typed })).data, 'ok')
    assert.equal((await member.rpc('is_admin')).data, true)
    assert.equal(
      (await admin.rpc('accept_admin_invite', { code: invite.data })).data,
      'invalid_code',
    )

    const open = await admin.rpc('list_admin_invites')
    assert.ifError(open.error)
    assert.ok(
      !open.data.some((row) => row.email === memberEmail && !row.is_expired),
      'used invite is gone',
    )

    // Removing: never yourself, others yes — and their rights end immediately.
    assert.equal(
      (await admin.rpc('remove_admin', { target: self.user_id })).data,
      'cannot_remove_self',
    )
    const memberId = (await admin.rpc('list_admins')).data.find(
      (row) => row.email === memberEmail,
    ).user_id
    assert.equal((await admin.rpc('remove_admin', { target: memberId })).data, 'ok')
    assert.equal((await member.rpc('is_admin')).data, false)
    assert.ok((await member.rpc('list_admins')).error)

    // Revoking an open invitation makes its code worthless.
    const revoked = await admin.rpc('create_admin_invite', { invite_email: memberEmail })
    const pending = (await admin.rpc('list_admin_invites')).data.find(
      (row) => row.email === memberEmail && !row.is_expired,
    )
    assert.ifError((await admin.rpc('revoke_admin_invite', { invite_id: pending.id })).error)
    assert.equal(
      (await member.rpc('accept_admin_invite', { code: revoked.data })).data,
      'invalid_code',
    )

    await service.from('admin_invites').delete().like('email', '%@rls-test.local')
  })
})
