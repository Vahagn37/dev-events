'use client';

import { useId, useRef } from 'react';

export default function Registrations({ emails, title }: { emails: string[]; title?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" className="registrations-open" onClick={open}>
        Registered
      </button>
      <dialog
        ref={dialogRef}
        className="registrations-dialog"
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="panel">
          <h3 id={headingId}>Registered</h3>
          {title ? <p className="event-title">{title}</p> : null}
          {emails.length > 0 ? (
            <ul>
              {emails.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          ) : (
            <p>No one has registered yet.</p>
          )}
          <button type="button" className="registrations-close" onClick={close}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
