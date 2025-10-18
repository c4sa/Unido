/**
 * Generate Passcodes Script
 * Creates 3000 unique passcodes in the format UN-xxxx
 * Run this script after setting up the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    console.log('Please make sure you have a .env file with VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generatePasscodes(count = 3000) {
  console.log(`Generating ${count} unique passcodes...`);
  
  try {
    // Call the improved database function to generate passcodes
    const { data, error } = await supabase.rpc('generate_passcodes', {
      count: count
    });

    if (error) {
      console.error('Error generating passcodes:', error);
      process.exit(1);
    }

    // Verify the count
    const { data: passcodes, error: countError } = await supabase
      .from('passcodes')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('Error counting passcodes:', countError);
      process.exit(1);
    }

    const actualCount = passcodes.length;
    
    if (actualCount === count) {
      console.log(`✅ Successfully generated ${actualCount} passcodes!`);
    } else {
      console.error(`❌ Error: Expected ${count} passcodes but got ${actualCount}`);
      process.exit(1);
    }

    // Show some sample passcodes
    const { data: samples, error: sampleError } = await supabase
      .from('passcodes')
      .select('code')
      .limit(5);

    if (!sampleError && samples) {
      console.log('📝 Sample passcodes:');
      samples.forEach(passcode => {
        console.log(`   - ${passcode.code}`);
      });
    }

    // Check for duplicates (should be 0)
    const { data: duplicates, error: dupError } = await supabase
      .from('passcodes')
      .select('code')
      .group('code')
      .having('count(*) > 1');

    if (!dupError && duplicates && duplicates.length > 0) {
      console.error(`❌ Error: Found ${duplicates.length} duplicate passcodes!`);
      process.exit(1);
    } else {
      console.log('✅ All passcodes are unique!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
generatePasscodes(3000);
