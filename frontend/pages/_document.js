import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon — uses the university logo from /public */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png.webp" type="image/webp" />
        <link rel="shortcut icon" href="/logo.png.webp" />
        <link rel="apple-touch-icon" href="/logo.png.webp" />
        <meta name="theme-color" content="#041476" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
