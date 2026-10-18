<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Render Mercado Pago Card Payment Brick outside any parent HTML form and map its direct CardData callback payload; the SDK owns submission and tokenization.
- Card submission callbacks must use current checkout state and reject failed attempts so the SDK can reset for retry.
- Owner dashboard lives under the managed authenticated layout; every owner read and moderation function validates the caller's admin role with the authenticated client before accessing platform-wide data, keeping ordinary sellers isolated by RLS.
- Owner CRUD runs through authenticated server functions and loads privileged database access only after role validation, so admin edits remain isolated from seller permissions.
