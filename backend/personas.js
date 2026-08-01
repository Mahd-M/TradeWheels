/* eslint-disable no-undef */
// shared test-user profiles, used by seedFavourites.js and seedCarViews.js
// so a persona's favourites and browsing history stay consistent
module.exports.PERSONAS = [
  { userId: 4,  label: 'sedan/Honda-Toyota commuter',  where: "(make = 'Honda' OR make = 'Toyota') AND bodyType = 'Sedan'", favouriteCount: 4, viewCount: 8 },
  { userId: 5,  label: 'exotic/hyper enthusiast',       where: "bodyType IN ('Hyper Car', 'Super Car')",              favouriteCount: 3, viewCount: 6 },
  { userId: 6,  label: 'exotic sports enthusiast',      where: "bodyType IN ('Sports Car', 'Hyper Car')",             favouriteCount: 2, viewCount: 6 },
  { userId: 7,  label: 'everyday sedan buyer',          where: "bodyType = 'Sedan' AND make IN ('Toyota', 'Suzuki')", favouriteCount: 2, viewCount: 6 },
  { userId: 8,  label: 'pickup/van buyer',              where: "bodyType IN ('Pickup', 'Van')",                      favouriteCount: 2, viewCount: 6 },
  { userId: 9,  label: 'SUV family buyer',              where: "bodyType = 'SUV' AND make IN ('Kia', 'Hyundai')",    favouriteCount: 2, viewCount: 6 },
  { userId: 10, label: 'exotic sports buyer',           where: "bodyType IN ('Super Car', 'Sports Car')",            favouriteCount: 2, viewCount: 6 },
  { userId: 11, label: 'hypercar buyer',                where: "bodyType = 'Hyper Car'",                             favouriteCount: 2, viewCount: 6 },
  { userId: 12, label: 'Honda loyalist',                where: "make = 'Honda'",                                     favouriteCount: 2, viewCount: 6 },
  { userId: 13, label: 'German luxury buyer',           where: "make IN ('Porsche', 'BMW', 'Mercedes-Benz', 'Audi')", favouriteCount: 2, viewCount: 6 },
]