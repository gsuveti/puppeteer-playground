var express = require('express')
var fs = require('fs')
var router = express.Router()
var path = require('path')
var moment = require('moment')
var glob = require('glob')

const puppeteer = require('puppeteer')

class Webpage {
  static async downloadTableData (url, date) {
    const browser = await puppeteer.launch({headless: true}) // Puppeteer can only generate pdf in headless mode.
    const page = await browser.newPage()
    // await page.goto(url); // Adjust network idle as required.
    await page.goto(url)

    const result = await page.evaluate(function ({date}) {
      const data = window.jQuery('#ToateFondurile1').DataTable().fnGetData()
      const columns = window.jQuery('#ToateFondurile1').DataTable().fnSettings().aoColumns.map(column => {
        const title = column.sTitle
        return title.toLowerCase()
          .replace(/[`~!@#$%^&*()_|+\-=÷¿?;:'",.<>\{\}\[\]\\\/]/gi, '')
          .trim()
          .replace(/[ ]+/g, '_')
      })
      const result = data.map((line) => {
        return columns.reduce((previousValue, column, index) => {
          previousValue[column] = line[index]
          previousValue.date = date
          return previousValue
        }, {})
      })

      return Promise.resolve(result)
    }, {date})

    const watchDog = page.waitForFunction('window.jQuery !== undefined')
    await watchDog

    await browser.close()

    return result

  }
}

/* GET users listing. */
router.get('/concat', function (req, res, next) {
  (async () => {
    // var contents = fs.readFileSync('jsoncontent.json')
    glob(path.join(__dirname, `../public/*.json`), {}, function (er, files) {
      if (files) {
        files.map(file => {
          console.log(file)
        })
      }
      res.send(files)
    })
  })()
})

/* GET users listing. */
router.get('/', function (req, res, next) {
  (async () => {

    var date = moment('2007-01-01', 'YYYY-MM-DD')
    res.send('ok')

    var aaf = []

    while (date < moment()) {
      console.log(date.format(`YYYY-MM`))

      const url = `http://www.aaf.ro/fonduri-deschise/?startd=${date.format('MM/YYYY')}`
      const buffer = await Webpage.downloadTableData(url, date.format(`YYYY-MM`))
      aaf.concat(buffer)

      const filePath = path.join(__dirname, `../public/${date.format(`YYYY-MM`)}.json`)
      fs.writeFile(filePath, JSON.stringify(buffer), function (err) {
        if (err) {
          return console.log(err)
        }
      })
      date = date.add(1, 'M').startOf('month')
    }

  })()
})

module.exports = router
