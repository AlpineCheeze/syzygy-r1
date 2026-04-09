const https = require('https');

https.get('https://www.wunderpower.com/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const inlineStyles = data.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
    if (inlineStyles) {
      inlineStyles.forEach(style => {
        const fonts = style.match(/font-family:[^;]+/g);
        if (fonts) {
          console.log(new Set(fonts));
        }
      });
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
