/* global require, module */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
const { requireAuth, requireOwnerOrAdmin } = require('../middleware')
const { deleteUploadedFile } = require('../upload')
const { buildCarFilters, HOVER_IMAGE_JOIN, HOVER_IMAGE_SELECT } = require('../utils/carQuery')

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 12))
    const offset = (page - 1) * pageSize
    const sort = req.query.sort

    const pool = await getPool()

    const countRequest = pool.request()
    const whereCount = buildCarFilters(countRequest, req.query)
    const countResult = await countRequest.query(`SELECT COUNT(*) AS total FROM Cars ${whereCount}`)
    const totalCount = countResult.recordset[0].total
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    let orderBy = 'ORDER BY Cars.createdAt DESC'
    if (sort === 'low') orderBy = 'ORDER BY Cars.price ASC'
    else if (sort === 'high') orderBy = 'ORDER BY Cars.price DESC'

    const dataRequest = pool.request()
    const whereData = buildCarFilters(dataRequest, req.query)
    dataRequest.input('offset', sql.Int, offset)
    dataRequest.input('pageSize', sql.Int, pageSize)

    const result = await dataRequest.query(`
      SELECT Cars.*, Users.name AS ownerName, ${HOVER_IMAGE_SELECT}
      FROM Cars
      LEFT JOIN Users ON Cars.ownerId = Users.id
      ${HOVER_IMAGE_JOIN}
      ${whereData}
      ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `)

    res.json({ cars: result.recordset, totalCount, totalPages, currentPage: page })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})


router.get('/mine', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 12))
    const offset = (page - 1) * pageSize
    const sort = req.query.sort

    const pool = await getPool()

    // buildCarFilters can return '' - can't just tack "AND ownerId=..." onto that
    const countRequest = pool.request()
    countRequest.input('ownerId', sql.Int, req.user.id)
    const filterCount = buildCarFilters(countRequest, req.query)
    const whereCount = filterCount ? `${filterCount} AND Cars.ownerId = @ownerId` : 'WHERE Cars.ownerId = @ownerId'
    const countResult = await countRequest.query(`SELECT COUNT(*) AS total FROM Cars ${whereCount}`)
    const totalCount = countResult.recordset[0].total
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    let orderBy = 'ORDER BY Cars.createdAt DESC'
    if (sort === 'low') orderBy = 'ORDER BY Cars.price ASC'
    else if (sort === 'high') orderBy = 'ORDER BY Cars.price DESC'

    const dataRequest = pool.request()
    dataRequest.input('ownerId', sql.Int, req.user.id)
    const filterData = buildCarFilters(dataRequest, req.query)
    const whereData = filterData ? `${filterData} AND Cars.ownerId = @ownerId` : 'WHERE Cars.ownerId = @ownerId'
    dataRequest.input('offset', sql.Int, offset)
    dataRequest.input('pageSize', sql.Int, pageSize)

    const result = await dataRequest.query(`
      SELECT Cars.*, Users.name AS ownerName, ${HOVER_IMAGE_SELECT}
      FROM Cars
      LEFT JOIN Users ON Cars.ownerId = Users.id
      ${HOVER_IMAGE_JOIN}
      ${whereData}
      ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `)

    res.json({ cars: result.recordset, totalCount, totalPages, currentPage: page })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Cars WHERE id = @id')
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Car not found' })
    }

    const imagesResult = await pool.request()
      .input('carId', sql.Int, req.params.id)
      .query('SELECT imageUrl FROM CarImages WHERE carId = @carId ORDER BY sortOrder ASC')

    const car = result.recordset[0]
    car.images = imagesResult.recordset.length > 0
      ? imagesResult.recordset.map((r) => r.imageUrl)
      : [car.image].filter(Boolean)

    res.json(car)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      make, model, variant, year, price, city, mileage,
      transmission, fuelType, bodyType, color, engineCapacity,
      description, images, sellerName, sellerPhone
    } = req.body

    const imageList = Array.isArray(images) ? images.filter(Boolean) : []
    if (imageList.length === 0) {
      return res.status(400).json({ error: 'At least one photo is required' })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('make', sql.NVarChar, make)
      .input('model', sql.NVarChar, model)
      .input('variant', sql.NVarChar, variant)
      .input('year', sql.Int, year)
      .input('price', sql.BigInt, price)
      .input('city', sql.NVarChar, city)
      .input('mileage', sql.Int, mileage)
      .input('transmission', sql.NVarChar, transmission)
      .input('fuelType', sql.NVarChar, fuelType)
      .input('bodyType', sql.NVarChar, bodyType)
      .input('color', sql.NVarChar, color)
      .input('engineCapacity', sql.NVarChar, engineCapacity)
      .input('description', sql.NVarChar, description)
      .input('image', sql.NVarChar, imageList[0])
      .input('sellerName', sql.NVarChar, sellerName)
      .input('sellerPhone', sql.NVarChar, sellerPhone)
      .input('ownerId', sql.Int, req.user.id)
      .query(`
        INSERT INTO Cars (make, model, variant, year, price, city, mileage, transmission, fuelType, bodyType, color, engineCapacity, description, image, sellerName, sellerPhone, ownerId)
        OUTPUT INSERTED.*
        VALUES (@make, @model, @variant, @year, @price, @city, @mileage, @transmission, @fuelType, @bodyType, @color, @engineCapacity, @description, @image, @sellerName, @sellerPhone, @ownerId)
      `)

    const car = result.recordset[0]

    for (let i = 0; i < imageList.length; i += 1) {
      await pool.request()
        .input('carId', sql.Int, car.id)
        .input('imageUrl', sql.NVarChar, imageList[i])
        .input('sortOrder', sql.Int, i)
        .query('INSERT INTO CarImages (carId, imageUrl, sortOrder) VALUES (@carId, @imageUrl, @sortOrder)')
    }

    res.status(201).json({ ...car, images: imageList })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/:id', requireOwnerOrAdmin, async (req, res) => {
  try {
    const {
      make, model, variant, year, price, city, mileage,
      transmission, fuelType, bodyType, color, engineCapacity,
      description, images, sellerName, sellerPhone
    } = req.body

    const imageList = Array.isArray(images) ? images.filter(Boolean) : []
    if (imageList.length === 0) {
      return res.status(400).json({ error: 'At least one photo is required' })
    }

    const pool = await getPool()

    const existingResult = await pool.request()
      .input('carId', sql.Int, req.params.id)
      .query('SELECT imageUrl FROM CarImages WHERE carId = @carId')
    const existingUrls = existingResult.recordset.map((r) => r.imageUrl)
    const removedUrls = existingUrls.filter((url) => !imageList.includes(url))

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('make', sql.NVarChar, make)
      .input('model', sql.NVarChar, model)
      .input('variant', sql.NVarChar, variant)
      .input('year', sql.Int, year)
      .input('price', sql.BigInt, price)
      .input('city', sql.NVarChar, city)
      .input('mileage', sql.Int, mileage)
      .input('transmission', sql.NVarChar, transmission)
      .input('fuelType', sql.NVarChar, fuelType)
      .input('bodyType', sql.NVarChar, bodyType)
      .input('color', sql.NVarChar, color)
      .input('engineCapacity', sql.NVarChar, engineCapacity)
      .input('description', sql.NVarChar, description)
      .input('image', sql.NVarChar, imageList[0])
      .input('sellerName', sql.NVarChar, sellerName)
      .input('sellerPhone', sql.NVarChar, sellerPhone)
      .query(`
        UPDATE Cars SET
          make=@make, model=@model, variant=@variant, year=@year, price=@price,
          city=@city, mileage=@mileage, transmission=@transmission, fuelType=@fuelType,
          bodyType=@bodyType, color=@color, engineCapacity=@engineCapacity,
          description=@description, image=@image, sellerName=@sellerName, sellerPhone=@sellerPhone
        OUTPUT INSERTED.*
        WHERE id=@id
      `)

    await pool.request()
      .input('carId', sql.Int, req.params.id)
      .query('DELETE FROM CarImages WHERE carId = @carId')

    for (let i = 0; i < imageList.length; i += 1) {
      await pool.request()
        .input('carId', sql.Int, req.params.id)
        .input('imageUrl', sql.NVarChar, imageList[i])
        .input('sortOrder', sql.Int, i)
        .query('INSERT INTO CarImages (carId, imageUrl, sortOrder) VALUES (@carId, @imageUrl, @sortOrder)')
    }

    await Promise.all(removedUrls.map((url) => deleteUploadedFile(url)))

    res.json({ ...result.recordset[0], images: imageList })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.delete('/:id', requireOwnerOrAdmin, async (req, res) => {
  try {
    const pool = await getPool()

    const imagesResult = await pool.request()
      .input('carId', sql.Int, req.params.id)
      .query('SELECT imageUrl FROM CarImages WHERE carId = @carId')
    const imageUrls = imagesResult.recordset.map((r) => r.imageUrl)

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Cars WHERE id = @id')

    await Promise.all(imageUrls.map((url) => deleteUploadedFile(url)))

    res.json({ message: 'Listing deleted' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router