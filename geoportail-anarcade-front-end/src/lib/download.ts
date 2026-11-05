export function postDownload(url: string, fields: Record<string, string>) {
  const name = `dl-${Date.now()}`
  const frame = document.createElement('iframe')
  frame.name = name
  frame.style.display = 'none'
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = url
  form.target = name
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = k; input.value = v
    form.appendChild(input)
  })
  document.body.append(frame, form)
  form.submit()
  setTimeout(() => { form.remove(); frame.remove() }, 10 * 60_000)
}