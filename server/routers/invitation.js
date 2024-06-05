const express = require('express');
const Datastore = require('../datastores');

const router = express.Router()

router.get('/:id', (req, res) => {
  const pluginId = Buffer
    .from(req.params.id, 'base64')
    .toString('ascii')

  Datastore.getInvitation(req.user.email, pluginId)
    .then(body => {
      if (body) {
        return res.json(body)
      } else {
        return res.status(400).json({ error: 'something wrong happened' })
      }
    })
    .catch(err => {
      if (err === "Not authorized") {
        res.redirect('/')
      }
    })
})

// router.post('/:hash', (req, res) => {
//   const pluginId = Buffer
//     .from(req.params.id, 'base64')
//     .toString('ascii')

//   Datastore.acceptInvitation(req.user.email, pluginId)
//     .then(accepted => {
//       if (accepted) {
//         res.redirect(`/?pluginId=${pluginId}`)
//       } else {
//         res.redirect('/')
//       }
//     })
// })

module.exports = router
