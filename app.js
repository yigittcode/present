const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { createHandler } = require('graphql-http/lib/use/express');
const app = express();
const graphqlSchema = require('./graphQL/schema');
const graphqlResolvers = require('./graphQL/resolvers');
const  { GraphQLError } = require("graphql") ;
const postRoute = require('./routes/posts');
const auth = require('./middlewares/auth');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
const helmet = require('helmet');
// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(express.json()); // application/json
app.use(helmet());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(auth);
app.use('/post', postRoute);
app.all('/graphql', createHandler({
    schema: graphqlSchema,
    rootValue: graphqlResolvers,
    context: (req, res) => ({ req }),  
    formatError: (err) => {
        return {
            message: err.message,
            code: err.extensions?.code || err.originalError?.code || 500,
            locations: err.locations,
            path: err.path,
            extensions: err.extensions,
        };
    },
}));



mongoose.connect(MONGODB_URI)
    .then(result => {
        const port = process.env.PORT || 8080;
        app.listen(port, () => {
            console.log('Server is running on port '+ port);
        });
    })
    .catch(err => console.error(err));