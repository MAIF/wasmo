const express = require('express');
const Datastore = require('../datastores');

const router = express.Router()

router.get('/:id', (req, res) => {
  const [userId, pluginId] = Buffer
    .from(req.params.id, 'base64')
    .toString('ascii')
    .split(":")

  if (req.user.email !== userId) {
    Datastore.getInvitation(req.user.email, userId, pluginId)
      .then(body => {
        if (body) {
          return res.json(body)
        } else {
          return res.status(400).json({ error: 'something wrong happened' })
        }
      })
  } else {
    res.status(400).json({ error: 'something wrong happened' })
  }
})

router.post('/:hash', (req, res) => {
  const [userId, pluginId] = Buffer
    .from(req.params.hash, 'base64')
    .toString('ascii')
    .split(":")

  if (req.user.email !== userId) {
    Datastore.acceptInvitation(req.user.email, userId, pluginId)
      .then(accepted => {
        if (accepted) {
          res.redirect(`/?pluginId=${pluginId}`)
        } else {
          res.redirect('/')
        }
      })
  } else {
    res.redirect('/')
  }
})

module.exports = router
