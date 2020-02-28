const express = require('express')

let app = express();

app.use((req, res, next) =>{
    console.log('PATH: '+req.path);
    next();
});

app.get('/', (req, res, next)=>{
    res.send(`<html>
    <head></head><body><div><h2>sdfsfasf</h2></div></body></html>`)
    res.end();
});

app.use((req, res, next)=>{
    console.log('404');
    res.status(404);
    res.send('404');
    res.end();
});
app.listen(8080);