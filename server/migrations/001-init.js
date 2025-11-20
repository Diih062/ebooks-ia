/* eslint-disable no-unused-vars */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('leads', {
    id: { type: 'serial', primaryKey: true },
    first_name: { type: 'text' },
    email: { type: 'text', notNull: true },
    sendpulse_id: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('leads', 'leads_email_unique', {
    foreignKeys: [],
  });

  // ensure unique index on email
  pgm.createIndex('leads', 'email', { unique: true });

  pgm.createTable('email_jobs', {
    id: { type: 'serial', primaryKey: true },
    email: { type: 'text', notNull: true },
    first_name: { type: 'text' },
    delay_type: { type: 'text' },
    queued: { type: 'boolean', default: false },
    sent_at: { type: 'timestamp' },
    error_text: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('email_jobs');
  pgm.dropIndex('leads', 'email');
  pgm.dropTable('leads');
};
