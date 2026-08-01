/* global require, module */
const { sql } = require('../db')

// shared by cars.js, recommendations.js, favourites.js - hover-image OUTER APPLY
// for anywhere Cars.* gets used in a card display
function buildCarFilters(request, query) {
  const conditions = []
  const { search, city, bodyType, transmission } = query

  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean)
    tokens.forEach((token, i) => {
      request.input(`searchToken${i}`, sql.NVarChar, `%${token}%`)
      conditions.push(`(Cars.make LIKE @searchToken${i} OR Cars.model LIKE @searchToken${i} OR Cars.city LIKE @searchToken${i})`)
    })
  }

  if (city === 'other-cities') {
    const defaultCities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Sialkot', 'Quetta']
    defaultCities.forEach((c, i) => request.input(`defCity${i}`, sql.NVarChar, c))
    conditions.push(`Cars.city NOT IN (${defaultCities.map((_, i) => `@defCity${i}`).join(', ')})`)
  } else if (city) {
    request.input('city', sql.NVarChar, city)
    conditions.push('Cars.city = @city')
  }

  if (bodyType) {
    request.input('bodyType', sql.NVarChar, bodyType)
    conditions.push('Cars.bodyType = @bodyType')
  }

  if (transmission) {
    request.input('transmission', sql.NVarChar, transmission)
    conditions.push('Cars.transmission = @transmission')
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
}

// NULL if the car has one photo or none - CarCard treats that as no hover swap
const HOVER_IMAGE_JOIN = `
  OUTER APPLY (
    SELECT ci.imageUrl
    FROM CarImages ci
    WHERE ci.carId = Cars.id
    ORDER BY ci.sortOrder ASC
    OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY
  ) hoverImg
`
const HOVER_IMAGE_SELECT = 'hoverImg.imageUrl AS hoverImage'

module.exports = { buildCarFilters, HOVER_IMAGE_JOIN, HOVER_IMAGE_SELECT }