export const urlJoin = (...parts: string[]) => {
  return (
    '/' +
    parts
      .filter(Boolean)
      .map((p) => p.replace(/^\/+|\/+$/g, ''))
      .join('/')
  )
}

export const trailingSlash = (pattern: string) => {
  return pattern.endsWith('/') ? pattern : `${pattern}/`
}

export const urlJoinTrailing = (...parts: string[]) => {
  return trailingSlash(urlJoin(...parts))
}

export const urlpath = {
  join: urlJoin,
  trailingSlash,
  trailingSlashJoin: urlJoinTrailing,
}

export default urlpath
