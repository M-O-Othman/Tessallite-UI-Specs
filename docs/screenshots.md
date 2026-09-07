# Viewer screenshots

These screenshots are small, real captures of the self-contained viewer. They
show how the graph, semantic icons, static text preview and inspector fit
together. They are teaching examples, not part of the JSON format.

## Structure graph

![A structure graph with a green screen root and cards for a login form, fields, a banner and a button.](screenshots/viewer-structure.png)

The left panel chooses the view and scope. The middle panel is the graph. The
small symbol in each card identifies its node type. A card's second line says
what it is; a lower line shows literal text when the document contains it.

## Selected node and static text

![A selected text card named login-connect-text with the word Connect in the inspector.](screenshots/viewer-inspector.png)

The right panel is the inspector. It gives the node's purpose and identity. A
literal caption appears in the **Static text** section. The full value remains
available even when the graph card must shorten a long sentence.

## Large source-derived document

![The web application document opened in the Components view with a Login surface and a ConfirmProvider component.](screenshots/viewer-web-application.png)

Large documents open at a shallow depth so the first view stays readable. Use
the plus button, depth control or search result to reveal more of the tree.

## Screenshot rules

- Images use stable, descriptive filenames rather than a date in the name.
- Alt text says what a reader can learn from the image.
- The images contain no passwords, access tokens or customer data.
- A screenshot cannot prove that every runtime state works.
- If a screenshot and the viewer disagree, trust the code and tests,
  then capture a new image and update this page.
