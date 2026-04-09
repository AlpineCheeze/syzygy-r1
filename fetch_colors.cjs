const https = require('https');

https.get('https://www.wunderpower.com/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const cssLinks = data.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g);
    console.log(cssLinks);
    const inlineStyles = data.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
    if (inlineStyles) {
      console.log("Inline styles found");
      inlineStyles.forEach(style => {
        const colors = style.match(/#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)/g);
        if (colors) {
          console.log(new Set(colors));
        }
      });
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
