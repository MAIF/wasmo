## Getting Started

Install the dependencies

```
yarn install
```

Launch the documentation server

```
yarn run dev
```

If all goes well, the documentation should now be serving your project on [wasmo](`http://localhost:3000/wasmo`)

Build production bundle

```
yarn run buid
```

Generate the search indexation content

```
npx pagefind --site "out" --output-path "out/dist"
```




