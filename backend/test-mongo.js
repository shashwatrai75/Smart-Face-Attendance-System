require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    
    if (!process.env.MONGODB_URI) {
      console.log('✗ ERROR: MONGODB_URI not found in .env file');
      process.exit(1);
    }
    
    // Show connection string (masked password)
    const uri = process.env.MONGODB_URI;
    const maskedUri = uri.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://$1:***@');
    console.log('Connection string (masked):', maskedUri);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✓ SUCCESS! MongoDB Connected!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    console.log('Ready State:', mongoose.connection.readyState, '(1 = connected)');
    
    await mongoose.disconnect();
    console.log('\n✓ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.log('\n✗ FAILED!');
    console.log('Error:', error.message);
    
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.log('\n⚠️  Authentication failed!');
      console.log('Check your username and password in .env file');
      console.log('Make sure:');
      console.log('  - Username is correct');
      console.log('  - Password is correct (no extra spaces)');
      console.log('  - Special characters in password are URL-encoded');
    } else if (error.message.includes('IP') || error.message.includes('whitelist') || error.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  IP Whitelist or Network issue!');
      console.log('Even though 0.0.0.0/0 is added, try:');
      console.log('1. Wait 2-3 more minutes for changes to propagate');
      console.log('2. Go to MongoDB Atlas → Network Access');
      console.log('3. Remove 0.0.0.0/0 and add it again');
      console.log('4. Or add your specific current IP address');
      console.log('5. Make sure cluster is running (not paused)');
    } else if (error.message.includes('timeout') || error.message.includes('buffering')) {
      console.log('\n⚠️  Connection timeout!');
      console.log('Possible causes:');
      console.log('  - IP not whitelisted (wait 2-3 minutes after adding)');
      console.log('  - Network/firewall blocking connection');
      console.log('  - MongoDB Atlas cluster is paused');
      console.log('  - Wrong connection string');
    } else {
      console.log('\n⚠️  Unknown error!');
      console.log('Full error:', error);
    }
    
    process.exit(1);
  }
};

testConnection();

