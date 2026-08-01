/* eslint-disable no-undef */
// seedCars.js - bulk-generates realistic car listings for recommendation testing.
// Run once from backend/: node seedCars.js
// Adjust CAR_COUNT below to seed more/fewer.

require('dotenv').config()
const { getPool, sql } = require('./db')

const CAR_COUNT = 3000
const CURRENT_YEAR = 2026

// ---------- Catalog: segment -> models, each with consistent bodyType/fuel/engine ----------

const SEGMENTS = [
  {
    name: 'hatchback',
    weight: 30,
    entries: [
      { make: 'Suzuki', model: 'Alto', variants: ['VXR', 'VXL', 'VXR AGS'], bodyType: 'Hatchback', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['660cc'], priceRange: [1700000, 2700000] },
      { make: 'Suzuki', model: 'Cultus', variants: ['VXR', 'VXL', 'VXR AGS'], bodyType: 'Hatchback', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1000cc'], priceRange: [2100000, 3100000] },
      { make: 'Suzuki', model: 'Swift', variants: ['GL', 'GLX', 'GLX CVT'], bodyType: 'Hatchback', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1200cc', '1300cc'], priceRange: [2800000, 3800000] },
      { make: 'Suzuki', model: 'Wagon R', variants: ['VXL', 'VXR'], bodyType: 'Hatchback', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1000cc'], priceRange: [2300000, 3200000] },
      { make: 'Daihatsu', model: 'Mira', variants: ['X', 'Custom X'], bodyType: 'Hatchback', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['660cc'], priceRange: [1900000, 2600000] },
      { make: 'Kia', model: 'Picanto', variants: ['GT Line', 'Standard'], bodyType: 'Hatchback', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1000cc', '1200cc'], priceRange: [2600000, 3500000] },
    ],
  },
  {
    name: 'sedan',
    weight: 35,
    entries: [
      { make: 'Toyota', model: 'Corolla', variants: ['GLI', 'Altis', 'Altis Grande'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1300cc', '1600cc', '1800cc'], priceRange: [4000000, 6800000] },
      { make: 'Honda', model: 'Civic', variants: ['Oriel', 'RS Turbo', 'X CVT'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['1500cc', '1800cc'], priceRange: [5500000, 8000000] },
      { make: 'Honda', model: 'City', variants: ['Aspire', 'GLi'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1200cc', '1500cc'], priceRange: [3600000, 4900000] },
      { make: 'Toyota', model: 'Yaris', variants: ['GLi', 'ATIV X'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1300cc', '1500cc'], priceRange: [3600000, 5000000] },
      { make: 'Changan', model: 'Alsvin', variants: ['Comfort', 'Lumiere'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic', 'Manual'], engine: ['1500cc'], priceRange: [2700000, 3500000] },
      { make: 'Hyundai', model: 'Elantra', variants: ['GLS'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['1600cc', '2000cc'], priceRange: [5500000, 7200000] },
      { make: 'MG', model: '5', variants: ['Standard'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['1500cc'], priceRange: [4500000, 5600000] },
    ],
  },
  {
    name: 'suv',
    weight: 20,
    entries: [
      { make: 'Kia', model: 'Sportage', variants: ['Alpha AT', 'FWD', 'AWD'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['2000cc'], priceRange: [7500000, 9800000] },
      { make: 'Hyundai', model: 'Tucson', variants: ['GLS Sport'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['2000cc'], priceRange: [8500000, 10800000] },
      { make: 'MG', model: 'HS', variants: ['Exclusive DCT'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['1500cc'], priceRange: [9500000, 11800000] },
      { make: 'Toyota', model: 'Fortuner', variants: ['Sigma 4', 'Legender'], bodyType: 'SUV', fuelTypes: ['Diesel', 'Petrol'], transmissions: ['Automatic'], engine: ['2700cc', '2800cc'], priceRange: [13000000, 17500000] },
      { make: 'Kia', model: 'Sorento', variants: ['AWD'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['2500cc'], priceRange: [12000000, 15500000] },
      { make: 'Proton', model: 'X70', variants: ['Executive'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['1800cc'], priceRange: [7500000, 9200000] },
      { make: 'Haval', model: 'H6', variants: ['HEV'], bodyType: 'SUV', fuelTypes: ['Hybrid', 'Petrol'], transmissions: ['Automatic'], engine: ['1500cc', '2000cc'], priceRange: [8500000, 11200000] },
      { make: 'Toyota', model: 'Land Cruiser', variants: ['ZX', 'VXR'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['3445cc'], priceRange: [60000000, 100000000] },
    ],
  },
  {
    name: 'pickup_van',
    weight: 10,
    entries: [
      { make: 'Toyota', model: 'Hilux Revo', variants: ['G', 'V'], bodyType: 'Pickup', fuelTypes: ['Diesel'], transmissions: ['Manual', 'Automatic'], engine: ['2400cc', '2800cc'], priceRange: [9500000, 13200000] },
      { make: 'Suzuki', model: 'Bolan', variants: ['Cargo Van', 'Euro II'], bodyType: 'Van', fuelTypes: ['Petrol'], transmissions: ['Manual'], engine: ['800cc'], priceRange: [900000, 1450000] },
      { make: 'Suzuki', model: 'Ravi', variants: ['Pickup', 'Euro II'], bodyType: 'Pickup', fuelTypes: ['Petrol'], transmissions: ['Manual'], engine: ['800cc'], priceRange: [1600000, 2150000] },
      { make: 'Isuzu', model: 'D-Max', variants: ['Standard'], bodyType: 'Pickup', fuelTypes: ['Diesel'], transmissions: ['Manual', 'Automatic'], engine: ['3000cc'], priceRange: [9000000, 11500000] },
    ],
  },
  {
    name: 'luxury',
    weight: 5,
    entries: [
      { make: 'Porsche', model: '911', variants: ['Carrera', 'Targa 4S'], bodyType: 'Sports Car', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['2981cc', '3000cc'], priceRange: [60000000, 120000000] },
      { make: 'Porsche', model: 'Taycan', variants: ['4S', 'Cross Turismo'], bodyType: 'Sports Car', fuelTypes: ['Electric'], transmissions: ['Automatic'], engine: ['429 hp', '500 hp'], priceRange: [25000000, 35000000] },
      { make: 'Ferrari', model: 'SF90', variants: ['Stradale'], bodyType: 'Super Car', fuelTypes: ['PHEV (Plug-in Hybrid)'], transmissions: ['Automatic'], engine: ['3990cc'], priceRange: [180000000, 210000000] },
      { make: 'McLaren', model: 'Senna', variants: ['Standard'], bodyType: 'Hyper Car', fuelTypes: ['Hybrid'], transmissions: ['Automatic'], engine: ['3994cc'], priceRange: [38000000, 45000000] },
      { make: 'Lamborghini', model: 'Urus', variants: ['S'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['4000cc'], priceRange: [90000000, 110000000] },
      { make: 'Mercedes-Benz', model: 'C-Class', variants: ['C200', 'C300'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['1500cc', '2000cc'], priceRange: [15000000, 20000000] },
      { make: 'BMW', model: '3 Series', variants: ['320i', '330i'], bodyType: 'Sedan', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['2000cc'], priceRange: [16000000, 22000000] },
      { make: 'Audi', model: 'Q5', variants: ['45 TFSI'], bodyType: 'SUV', fuelTypes: ['Petrol'], transmissions: ['Automatic'], engine: ['2000cc'], priceRange: [18000000, 24000000] },
      { make: 'Rimac', model: 'Nevera', variants: ['Time Attack Edition'], bodyType: 'Hyper Car', fuelTypes: ['Electric'], transmissions: ['Automatic'], engine: ['1914hp'], priceRange: [900000000, 1300000000] },
    ],
  },
]

const DEFAULT_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Sialkot', 'Quetta']
const EXTRA_CITIES = ['Bahawalpur', 'Wah Cantt', 'Gujranwala', 'Hyderabad', 'Sargodha', 'Sukkur', 'Abbottabad', 'Mardan', 'Sheikhupura', 'Dera Ghazi Khan', 'Jhelum', 'Kasur', 'Okara', 'Rahim Yar Khan', 'Gujrat', 'Muzaffarabad', 'Chiniot', 'Bannu', 'Kohat', 'Dera Ismail Khan', 'Mingora', 'Swat', 'Chakwal', 'Larkana', 'Mirpur Khas', 'Nawabshah', 'Khuzdar', 'Jacobabad', 'Turbat', 'Gwadar', 'Kotli', 'Sadiqabad', 'Mandi Bahauddin', 'Hafizabad', 'Pakpattan', 'Daska', 'Kamoke', 'Haripur', 'Mianwali', 'Chishtian', 'Tando Adam', 'Shikarpur', 'Kandhkot', 'Dadu', 'Hasilpur', 'Burewala', 'Khanewal', 'Sahiwal', 'Vehari', 'Tando Allahyar', 'Thatta', 'Lodhran', 'Matiari']
// weighted 3:1 toward the 9 cities FilterBar.jsx already treats as "default"
const CITY_POOL = [...DEFAULT_CITIES, ...DEFAULT_CITIES, ...DEFAULT_CITIES, ...EXTRA_CITIES]

const COLORS = ['Pearl White', 'Attitude Black', 'Silky Silver', 'Graphite Grey', 'Carnelian Red', 'Morpho Blue', 'Snow White Pearl', 'Deep Bronze', 'Burning Red', 'Typhoon Silver', 'Polar White', 'Sunset Orange', 'Midnight Black', 'Ocean Blue', 'Champagne Gold']

const FIRST_NAMES = ['Ahmed', 'Bilal', 'Usman', 'Tariq', 'Sana', 'Kamran', 'Zubair', 'Farrukh', 'Asim', 'Nadia', 'Shahid', 'Rizwan', 'Ali', 'Zara', 'Haider', 'Hassan', 'Fatima', 'Ayesha', 'Imran', 'Waqas', 'Saad', 'Hamza', 'Noor', 'Sara', 'Adeel' , 'Hina', 'Sami', 'Naveed', 'Amina', 'Rashid', 'Sadia', 'Faisal', 'Mariam', 'Junaid', 'Rabia', 'Omar', 'Saba', 'Zainab', 'Shahbaz', 'Areeba', 'Taimoor', 'Hafsa', 'Usama', 'Saira' , 'Nashit', 'Areej', 'Fahad', 'Sadia', 'Zeeshan', 'Hira', 'Ahsan', 'Sania', 'Rameez', 'Ayesha', 'Shahzaib', 'Nida', 'Fawad', 'Sadia', 'Haris', 'Aiman', 'Zubair', 'Sana', 'Tariq', 'Areeba', 'Usman', 'Hina', 'Bilal', 'Sadia', 'Fahad', 'Ayesha', 'Zain', 'Hira', 'Omar', 'Sana', 'Tariq', 'Areeba', 'Usman', 'Hina', 'Bilal', 'Sadia', 'Fahad', 'Ayesha', 'Zain', 'Hira', 'Omar', 'Sana', 'Tariq', 'Areeba', 'Usman', 'Hina' , 'Mahd']
const LAST_NAMES = ['Khan', 'Raza', 'Ali', 'Mehmood', 'Malik', 'Sheikh', 'Hassan', 'Iqbal', 'Chaudhry', 'Qureshi', 'Nawaz', 'Butt', 'Ahmed', 'Abbas', 'Aslam', 'Baloch', 'Siddiqui', 'Farooq', 'Javed', 'Akhtar' , 'Rashid', 'Hussain', 'Shah', 'Khalid', 'Nadeem', 'Saeed', 'Zafar', 'Rafiq', 'Junaid', 'Fahad', 'Tariq', 'Amin', 'Riaz', 'Shahid', 'Aziz', 'Nawazuddin', 'Feroz', 'Sultan', 'Irfan' , 'Rauf', 'Asif', 'Noman', 'Waseem', 'Zubair', 'Hameed', 'Rashid', 'Shamim', 'Nadeem', 'Faisal', 'Tahir', 'Adeel', 'Rashid', 'Shahbaz', 'Haris', 'Zeeshan', 'Sami', 'Ahsan', 'Omar', 'Usman', 'Bilal', 'Taimoor', 'Hassan', 'Fawad', 'Sajid', 'Naveed', 'Rameez' , 'Areeba', 'Sadia', 'Hina', 'Mariam']

const DESCRIPTION_OPENERS = ['Well maintained and driven with care.', 'Single owner, all original parts.', 'Excellent condition, no major repairs needed.', 'Regularly serviced at authorized service center.', 'Immaculate condition inside and out.', 'Clean title, all documents clear.', 'Non-accidental, genuine mileage.', 'Family used vehicle, garage kept.' , 'Low mileage for its age, runs smoothly.', 'Recently serviced and ready to drive.', 'Perfect for city driving and long trips.', 'Upgraded with premium accessories.', 'Fuel efficient and reliable daily driver.', 'Comfortable ride with smooth handling.', 'Spacious interior, ideal for families.', 'Well taken care of, no mechanical issues.', 'All maintenance records available upon request.', 'Drives like new, no rattles or noises.', 'Great value for the price, must see!', 'Clean interior, smoke-free vehicle.' , 'Recently detailed, looks brand new.', 'Perfect for first-time car buyers.', 'Excellent resale value, low depreciation.', 'Smooth transmission and responsive engine.', 'Upgraded sound system and infotainment.', 'Stylish exterior with modern design.', 'Well balanced suspension for a comfortable ride.', 'Reliable performance in all weather conditions.', 'Spacious trunk for all your storage needs.', 'All safety features in perfect working order.']
const DESCRIPTION_CLOSERS = ['Serious buyers only.', 'Price is slightly negotiable.', 'Available for inspection anytime.', 'Contact for more details and pictures.', 'First come first served.', 'No time wasters please.' , 'Ready for immediate transfer.', 'Test drive available upon request.' , 'All taxes and fees are clear.', 'Comes with original accessories and manuals.']

// weighted toward recent years - most listings on a real marketplace are newer cars
const YEAR_POOL = []
for (let y = 2010; y <= 2026; y += 1) {
  const weight = y >= 2020 ? 6 : y >= 2015 ? 3 : 1
  for (let i = 0; i < weight; i += 1) YEAR_POOL.push(y)
}

// ---------- Helpers ----------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickOne(arr) {
  return arr[randomInt(0, arr.length - 1)]
}

function pickSegment() {
  const totalWeight = SEGMENTS.reduce((sum, s) => sum + s.weight, 0)
  let roll = randomInt(1, totalWeight)
  for (const segment of SEGMENTS) {
    if (roll <= segment.weight) return segment
    roll -= segment.weight
  }
  return SEGMENTS[0]
}

function generatePhone() {
  return `03${randomInt(0, 9)}${randomInt(0, 9)}-${randomInt(1000000, 9999999)}`
}

function generateImage(make, model, index) {
  const seed = encodeURIComponent(`${make}-${model}-${index}`)
  return `https://picsum.photos/seed/${seed}/600/350`
}

function buildDescription() {
  return `${pickOne(DESCRIPTION_OPENERS)} ${pickOne(DESCRIPTION_CLOSERS)}`
}

function randomPastDate(maxDaysAgo) {
  return new Date(Date.now() - randomInt(0, maxDaysAgo * 24 * 60 * 60 * 1000))
}

function computeMileageAndPrice(entry, year) {
  const age = CURRENT_YEAR - year
  const mileage = Math.max(300, age * randomInt(3000, 9000) + randomInt(0, 4000))
  const basePrice = randomInt(entry.priceRange[0], entry.priceRange[1])
  const depreciation = Math.min(mileage / 400000, 0.35)
  const price = Math.round((basePrice * (1 - depreciation)) / 1000) * 1000
  return { mileage, price }
}

function generateCar(index, existingUserIds) {
  const segment = pickSegment()
  const entry = pickOne(segment.entries)
  const year = pickOne(YEAR_POOL)
  const { mileage, price } = computeMileageAndPrice(entry, year)

  return {
    make: entry.make,
    model: entry.model,
    variant: pickOne(entry.variants),
    year,
    price,
    city: pickOne(CITY_POOL),
    mileage,
    transmission: pickOne(entry.transmissions),
    fuelType: pickOne(entry.fuelTypes),
    bodyType: entry.bodyType,
    color: pickOne(COLORS),
    engineCapacity: pickOne(entry.engine),
    description: buildDescription(),
    image: generateImage(entry.make, entry.model, index),
    sellerName: `${pickOne(FIRST_NAMES)} ${pickOne(LAST_NAMES)}`,
    sellerPhone: generatePhone(),
    createdAt: randomPastDate(120),
    // 85% owned by an existing user, 15% left unowned
    ownerId: existingUserIds.length && Math.random() < 0.85 ? pickOne(existingUserIds) : null,
  }
}

// ---------- Main ----------

async function main() {
  const pool = await getPool()

  const usersResult = await pool.request().query('SELECT id FROM Users')
  const existingUserIds = usersResult.recordset.map((r) => r.id)

  const table = new sql.Table('Cars')
  table.create = false
  table.columns.add('make', sql.NVarChar(100), { nullable: false })
  table.columns.add('model', sql.NVarChar(100), { nullable: false })
  table.columns.add('variant', sql.NVarChar(200), { nullable: true })
  table.columns.add('year', sql.Int, { nullable: true })
  table.columns.add('price', sql.BigInt, { nullable: true })
  table.columns.add('city', sql.NVarChar(100), { nullable: true })
  table.columns.add('mileage', sql.Int, { nullable: true })
  table.columns.add('transmission', sql.NVarChar(50), { nullable: true })
  table.columns.add('fuelType', sql.NVarChar(50), { nullable: true })
  table.columns.add('bodyType', sql.NVarChar(50), { nullable: true })
  table.columns.add('color', sql.NVarChar(100), { nullable: true })
  table.columns.add('engineCapacity', sql.NVarChar(50), { nullable: true })
  table.columns.add('description', sql.NVarChar(sql.MAX), { nullable: true })
  table.columns.add('image', sql.NVarChar(1000), { nullable: true })
  table.columns.add('sellerName', sql.NVarChar(200), { nullable: true })
  table.columns.add('sellerPhone', sql.NVarChar(50), { nullable: true })
  table.columns.add('createdAt', sql.DateTime, { nullable: true })
  table.columns.add('ownerId', sql.Int, { nullable: true })

  const bodyTypeCounts = {}

  for (let i = 0; i < CAR_COUNT; i += 1) {
    const car = generateCar(i, existingUserIds)
    bodyTypeCounts[car.bodyType] = (bodyTypeCounts[car.bodyType] || 0) + 1
    table.rows.add(
      car.make, car.model, car.variant, car.year, car.price, car.city,
      car.mileage, car.transmission, car.fuelType, car.bodyType, car.color,
      car.engineCapacity, car.description, car.image, car.sellerName,
      car.sellerPhone, car.createdAt, car.ownerId
    )
  }

  await pool.request().bulk(table)

  const totalResult = await pool.request().query('SELECT COUNT(*) AS total FROM Cars')

  console.log(`Inserted ${CAR_COUNT} cars.`)
  console.log('Body type distribution:', bodyTypeCounts)
  console.log(`Total cars in DB now: ${totalResult.recordset[0].total}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err.message)
  process.exit(1)
})