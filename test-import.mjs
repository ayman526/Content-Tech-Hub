
  import('./server/index.js').then(() => {
    console.log('✓ Server imports successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('✗ Import error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
  