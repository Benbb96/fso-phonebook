require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const Person = require('./models/person')

const app = express()
app.use(express.json())
app.use(cors())
app.use(express.static('dist'))

morgan.token('req-body', req => JSON.stringify(req.body))

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :req-body'))

app.get('/api/persons', (request, response) => {
  Person.find({}).then(persons => response.json(persons))
})

app.post('/api/persons', (request, response, next) => {
  const body = request.body

  Person.find({}).then(persons => {
    const person = {
      name: body.name,
      number: body.number,
    }

    const existingPersonWithSameName = persons.find(p => p.name === body.name)
    if (existingPersonWithSameName) {
      // Only update person if number has changed
      if (existingPersonWithSameName.number !== body.number) {
        Person.findByIdAndUpdate(
          existingPersonWithSameName.id,
          person,
          {new: true, runValidators: true, context: 'query'}
        )
          .then(updatedPerson => response.json(updatedPerson))
          .catch(error => next(error))
      } else {
        return response
          .status(400)
          .json({error: `${body.name} is already added to phonebook with exact same number`})
      }
    } else {
      // Add person to database
      new Person(person)
        .save()
        .then(person => response.status(201).json(person))
        .catch(error => next(error))
    }
  })
})

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

app.patch('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        Person.findByIdAndUpdate(request.params.id, request.body, {new: true, runValidators: true, context: 'query'})
          .then(updatedPerson => response.json(updatedPerson))
          .catch(error => next(error))
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndDelete(request.params.id)
    .then(_ => response.status(204).end())
    .catch(error => next(error))
})

app.get('/info', (request, response) => {
  Person.find({})
    .then(persons =>
      response.send(`<p>Phonebook has info for ${persons.length} people</p><p>${new Date()}</p>`)
    )
})

// Handle 404
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

// Error handling
const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({error: 'malformatted id'})
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({error: error.message})
  }

  next(error)
}
app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})