import { cp, mkdir, rm } from 'node:fs/promises'

const output = new URL('./dist/', import.meta.url)
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
for (const file of ['index.html', 'app.js', 'model.js', 'data.js', 'style.css', 'favicon.svg']) {
  await cp(new URL(`./${file}`, import.meta.url), new URL(`./dist/${file}`, import.meta.url))
}
console.log('Built BatteryWise static site in web/dist (no dependencies).')


