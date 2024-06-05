import * as Service from './services'

import { useEffect, useState } from "react"

const LANGUAGES = {
  'js': 'Javascript',
  'go': "Golang",
  'rust': 'Rust',
  'ts': 'Typescript',
  'opa': 'Open Policy Agent'
}

function InvitationHandler() {

  const [invitation, setInvitation] = useState()

  useEffect(() => {
    const paths = window.location.pathname.split("/invitation");

    if (paths.length === 2) {
      const invitationId = paths[1].slice(1);

      Service.getInvitationInformation(invitationId)
        .then(response => {
          if (response.redirected) {
            window.location.href = response.url;
          } else {
            response
              .json()
              .then(invit => setInvitation({
                ...invit,
                invitationId
              }))
          }
        })
    }
  }, [])


  if (invitation === undefined)
    return null

  return <div className="share-plugin-modal" style={{
    opacity: 1,
    pointerEvents: 'auto'
  }}>
    <div className="d-flex flex-column align-items-start p-3 rounded">
      <div className="d-flex justify-content-between w-100 align-items-center">
        <h2>You invited to edit {invitation.filename} plugin</h2>

        <a
          href="#ok"
          onClick={() => {
            window.location.href = '/'
          }}
          title="Ok"
          className="btn btn-outline-dark d-flex align-items-center justify-content-center p-2"
          style={{
            maxHeight: 32
          }}>
          <i className="fa-solid fa-times" />
        </a>
      </div>

      <div className='d-flex flex-column align-items-start my-3'>
        <p className='m-0'>
          <b>Plugin language :</b> <span>{LANGUAGES[invitation.type]}</span>
        </p>
        <p>
          <b>Template used :</b> <span>{invitation.template}</span>
        </p>
      </div>

      <button
        type="button"
        className="btn btn-dark"
        onClick={() => {
          window.location.href = `/?pluginId=${atob(invitation.invitationId)}`
          // Service.acceptInvitation(invitation.invitationId)
          //   .then(response => {
          //     if (response.redirected) {
          //       window.location.href = response.url;
          //     }
          //   })
        }}>
        View plugin
      </button>
    </div>
  </div>
}

export default InvitationHandler