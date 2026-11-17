/**
 * Apollo Sandbox page.
 *
 * @nestjs/apollo always registers its own landing-page plugin (GraphQL Playground in
 * development, a disabled page in production), and Apollo Server refuses to start when
 * two plugins implement renderLandingPage. The driver is therefore configured with
 * `playground: false`, and this page — the same embedded Sandbox that Apollo's own
 * landing-page plugin renders — is served by a small middleware instead.
 */
export function renderSandboxPage(endpoint = '/graphql'): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Apollo Sandbox · Digital business card API</title>
    <style>
      html, body, #sandbox { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="sandbox"></div>
    <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
    <script>
      new window.EmbeddedSandbox({
        target: '#sandbox',
        initialEndpoint: window.location.origin + '${endpoint}',
        includeCookies: false,
      });
    </script>
  </body>
</html>`;
}
