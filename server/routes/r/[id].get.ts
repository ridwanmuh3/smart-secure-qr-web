export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  // Dynamic redirect: QR codes point here, and we redirect to the verify page.
  // This allows changing the destination without re-issuing QR codes.
  return sendRedirect(event, `/verify/${id}`, 302)
})
