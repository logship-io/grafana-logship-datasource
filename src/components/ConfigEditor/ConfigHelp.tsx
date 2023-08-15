import React from 'react';

interface ConfigHelpProps {}

const ConfigHelp: React.FC<ConfigHelpProps> = () => {
  return (
    <div className="gf-form-group">
      <div className="grafana-info-box">
        <h1>🚢 Welcome Aboard!</h1>
        <h3>Configuring the Logship Data Source</h3>
        
        <h5>Set a cluster URL</h5>
        <p><pre>http://localhost:5000/</pre> may be a good place to start.</p>
        <p>
          Detailed instructions on all steps can be found {' '}
          <a
            className="external-link"
            target="_blank"
            rel="noreferrer"
            href="https://logship.io/docs/intro/"
          >
            in the documentation.
          </a>
        </p>
      </div>
    </div>
  );
};

export default ConfigHelp;
