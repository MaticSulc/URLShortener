const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');


const db = require('monk')('localhost/urlredirect');
const urls = db.get('urls');
urls.createIndex('name');

const app = express();
const port = 80;

app.use(helmet());
app.use(morgan('tiny')); //log requests
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));

app.get('/:id', async (req, res, next) => {
    const { id: alias } = req.params;
    try {
      const url = await urls.findOne({ alias });
      if (url) {
        res.redirect(url.url);
      }
      res.redirect(`/?error=${alias} not found`);
    } catch (error) {
      res.redirect(`/?error=Link not found`);
    }
  });

function create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

const schema = yup.object().shape({
    alias: yup.string().trim(' ').matches(/[a-z0-9_-]/i), //regex alphanumeric, -, _, case insensitive
    url: yup.string().trim().url().required()
})

 app.post('/url', async (req, res, next) => {
    let { alias, url } = req.body;
    try {
      await schema.validate({
        alias,
        url
      });
      if (!alias) {
        alias = create_UUID();
      } else {
        const existing = await urls.findOne({ alias });
        if (existing) {
          throw new Error('Alias in use!');
        }
      }
      const newUrl = {
        url,
        alias
      };
      console.log(newUrl);
      const created = await urls.insert(newUrl);
      res.json(created);
    } catch (error) {
      next(error);
    }
  });

 app.use((error, req, res, next) => { //error handler
    if(error.status){           //error code like 404, 403 etc
        res.status(error.status)
    }
    else{
        res.status(500);    //internal server error
    }
    res.json({
        error: process.env.NODE_ENV === 'production' ? 'Oops.' : error.stack
    });
 })


app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});