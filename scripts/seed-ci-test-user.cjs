#!/usr/bin/env node
/**
 * Seed CI Test User
 *
 * This script ensures the CI test user exists in Supabase before E2E tests run.
 * It uses the Supabase Admin API with the service role key.
 *
 * Required environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - TEST_USER_EMAIL (default: test@bizscreen.test)
 *   - TEST_USER_PASSWORD (default: testpassword123)
 *
 * Usage:
 *   node scripts/seed-ci-test-user.cjs
 */

const TEST_USER_ID = 'c5a025d1-a2ec-4219-bed6-dd166ae77a57';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@bizscreen.test';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  console.log('Seeding CI test user...');
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Test email: ${testEmail}`);

  try {
    // Step 1: Check if user already exists
    console.log('\n1. Checking if test user exists...');
    const listResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`Failed to list users: ${listResponse.status} ${errorText}`);
    }

    const { users } = await listResponse.json();
    const existingUser = users?.find(u => u.email === testEmail);

    let userId;

    if (existingUser) {
      console.log(`   User already exists with ID: ${existingUser.id}`);
      userId = existingUser.id;

      // Update password to ensure it matches
      console.log('   Updating password to ensure it matches...');
      const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: testPassword,
          email_confirm: true
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.warn(`   Warning: Could not update user: ${updateResponse.status} ${errorText}`);
      } else {
        console.log('   Password updated successfully');
      }
    } else {
      // Step 2: Create user if doesn't exist
      console.log('   User not found, creating...');
      const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: {
            full_name: 'CI Test User'
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create user: ${createResponse.status} ${errorText}`);
      }

      const newUser = await createResponse.json();
      userId = newUser.id;
      console.log(`   Created user with ID: ${userId}`);
    }

    // Step 3: Ensure profile exists
    console.log('\n2. Ensuring profile exists...');
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Failed to check profile: ${profileResponse.status} ${errorText}`);
    }

    const profiles = await profileResponse.json();

    if (profiles.length === 0) {
      console.log('   Profile not found, creating...');
      const createProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: userId,
          email: testEmail,
          full_name: 'CI Test User',
          role: 'admin'
        })
      });

      if (!createProfileResponse.ok) {
        const errorText = await createProfileResponse.text();
        // Profile might be created by trigger, so just warn
        console.warn(`   Warning: Could not create profile: ${createProfileResponse.status} ${errorText}`);
      } else {
        console.log('   Profile created successfully');
      }
    } else {
      console.log(`   Profile exists with role: ${profiles[0].role || 'unknown'}`);

      // Ensure role is admin
      if (profiles[0].role !== 'admin') {
        console.log('   Updating role to admin...');
        const updateProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            role: 'admin'
          })
        });

        if (!updateProfileResponse.ok) {
          console.warn('   Warning: Could not update profile role');
        } else {
          console.log('   Profile role updated to admin');
        }
      }
    }

    console.log('\n✓ CI test user seeding complete!');
    console.log(`  User ID: ${userId}`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Role: admin`);

  } catch (error) {
    console.error('\n✗ Error seeding test user:', error.message);
    process.exit(1);
  }
}

main();
