const express = require('express');
const PORT = process.env.PORT || 8080;
const body_parser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;




const tuote_schema = new Schema({
        nimi: {type: String},
        url: {type: String},
        maara: {type: Number}
});

const tuote_model = new mongoose.model('tuote', tuote_schema);

const lista_schema = new Schema({
    text: {
        type: String,
        required: true
    },
    
});

const lista_model = new mongoose.model('lista', lista_schema);

const user_schema = new Schema({
    name: {
        type: String,
        required: true
    },
    listat: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'lista',
        req: true,
        
    }],
    tuotteet: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tuote'
  
    }]
    
});

const user_model = mongoose.model('user', user_schema);



let app = express();

app.use(body_parser.urlencoded({
    extended: true
}));

app.use(session({
    secret: '1234qwerty',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000000
    }
}));

app.use('/css', express.static('css'));


app.use((req, res, next) => {
    console.log(`path: ${req.path}`);
    next();
});

const is_logged_handler = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    user_model.findById(req.session.user._id).then((user) => {
        req.user = user;
        next();
    }).catch((err) => {
        console.log(err);
        res.redirect('login');
    });
});




app.post('/delete-lista', (req, res, next) => {
    const user = req.user;
    const lista_id_to_delete = req.body.lista_id;

    //Remove note from user.notes
    const updated_listat = user.listat.filter((lista_id) => {
        return lista_id != lista_id_to_delete;
    });
    user.listat = updated_listat;

    //Remove note object from database
    user.save().then(() => {
        lista_model.findByIdAndRemove(lista_id_to_delete).then(() => {
            
            res.redirect('/');
        });

    });
});

    
app.post('/add-lista', (req, res, next) => {
    const user = req.user;
   
    let new_lista = lista_model({
        text: req.body.lista
        
    });
    new_lista.save().then(() => {
        console.log('lista tallennettu');
        user.listat.push(new_lista);
        user.save().then(() => {
            return res.redirect('/');
        });
    });

    app.get('/lista/:id', (req, res, next) => {
        const lista_id = req.params.id;
        lista_model.findOne({
            _id: lista_id
        }).then((lista) => {
            res.send(lista.text);
        });
    });

});
app.post('/add-tuote', (req, res, next) => {
    const user = req.user;
   
    let new_tuote = tuote_model({
        nimi: req.body.nimi,
        url: req.body.url,
        maara: req.body.maara
        
    });
    new_tuote.save().then(() => {
        console.log('tuote tallennettu');
        user.tuotteet.push(new_tuote);
        user.save().then(() => {
            return res.redirect('/ostoslista/:id');
        });
        });
    });


app.post('/logout', (req, res, next) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', is_logged_handler, (req, res, next) => {
    const user = req.user;
    user.populate('listat')
    .execPopulate()
    .then(() => {
    console.log('user:', user);
    res.write(`
   
    <!DOCTYPE html>
    
    <html>
    <head>
    <title>Ostoslista</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="css/style.css">
    </head>
    <body>
    <h1>Ostoslista-applikaatio</h1>
    <br>
    <h2>Ostoslistat:</h2>
    <br>  
    `);
    user.listat.forEach((lista) => {
        res.write(`<a href="/ostoslista/${lista._id}">${lista.text}</a>`);
        res.write(`
        <form action="/delete-lista" method="POST">
            <input type="hidden" name="lista_id" value="${lista._id}">
            <button type="submit">Poista lista</button>
        </form>
        `);
            });

            res.write(`
            
            <form action="/add-lista" method="post">
            
                <input type="text" name="lista">
                <button type="submit">Lisaa ostoslista</button>
                
            </form>
            <br>
            Kirjautuneena: ${user.name}
        <form action="/logout" method="POST">
            <button type="submit">Log out</button>
        </form>
        </body>
        </html>
        
   
 
    `);
    res.end();
});
});

app.get('/ostoslista/:id', (req, res, next) => {
    const user = req.user;
    user.populate('tuotteet')
    .execPopulate()
    .then(() => {
    res.write(`
    <!DOCTYPE html>
    
    <html>
    <head>
    <title>Ostoslista</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="/css/style.css">
    </head>
    <body>
    <h1>Ostoslista-applikaatio</h1>
    <h2><a href="/">Menu</a></h2>
    <br>
   
    <h2>Ostoslista: </h2>
        <p>
        `);

        user.tuotteet.forEach((tuote) => {
        res.write(`<h3>${tuote.nimi}<br></h3><img src="${tuote.url}" width="100px" heigth="100px" /><br>Määrä: ${tuote.maara}`); 
    })
        res.write(`
        <br>
        Lisää uusi tuote:
        <form action="/add-tuote" method="POST">
        Tuotteen nimi:<br><input type="text" name="nimi"><br><br>
        Kuvan osoite:<br><input type="url" name="url" value="https://www.theflavorbender.com/wp-content/uploads/2019/02/Homemade-Bread-7989.jpg"><br><br>
        Määrä:</p><br><input type="number" name="maara"><br><br>
        <button type="submit">Lisää uusi tuote</button>
    </form>
    </body>
    </html>
    `);
    res.end();
});}); 

app.get('/login', (req, res, next) => {
    console.log('user: ', req.session.user)
    res.write(`
    <!DOCTYPE html>
    <html>
    <head>
    <title>Ostoslista</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="css/style.css" />
    </head>
    <body>
        <h1>Ostoslista</h1>
        <br>
        <form action="/login" method="POST">
            <input type="text" name="user_name">
            <button type="submit">Log in</button>
        </form>
        <form action="/register" method="POST">
            <input type="text" name="user_name">
            <button type="submit">Register</button>
        </form>
    </body>
    <html>
    `);
    res.end();
});

app.post('/login', (req, res, next) => {
    const user_name = req.body.user_name;
    user_model.findOne({
        name: user_name
    }).then((user) => {
        if (user) {
            req.session.user = user;
            return res.redirect('/');
        }

        res.redirect('/login');
    });
});

app.post('/register', (req, res, next) => {
    const user_name = req.body.user_name;

    user_model.findOne({
        name: user_name
    }).then((user) => {
        if (user) {
            console.log('User name already registered');
            return res.redirect('/login');
        }

        let new_user = new user_model({
            name: user_name,
            listat: [],
            tuotteet: []
        });

        new_user.save().then(() => {
            return res.redirect('/login');
        });

    });
});

app.use((req, res, next) => {
    res.status(404);
    res.send(`
        page not found
    `);
});


const mongoose_url = 'mongodb+srv://db-user:YYkTrG6hBWAphHYA@cluster0-izlph.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(mongoose_url, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log('Mongoose connected');
    console.log('Start Express server');
    app.listen(PORT);
});