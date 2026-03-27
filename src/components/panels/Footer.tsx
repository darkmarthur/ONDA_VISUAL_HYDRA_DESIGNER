'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__content">
        <span className="footer__text">
          Made with ❤️ by <a href="https://www.instagram.com/mariodquiroz/" target="_blank" rel="noopener noreferrer" className="footer__link" data-tooltip="Report any application bugs to me directly via instagram ❤️">MDQ</a> from <a href="https://ondavisual.mx/" target="_blank" rel="noopener noreferrer" className="footer__link">ONDAVISUAL.MX</a> / <a href="https://ondalabs.mx/" target="_blank" rel="noopener noreferrer" className="footer__link">ONDALABS.MX</a>
          <span className="footer__divider"> — </span>
          Powered by the magnificent project <a href="https://hydra.ojack.xyz/" target="_blank" rel="noopener noreferrer" className="footer__link">HYDRA VIDEO SYNTH</a> from <a href="https://ojack.xyz/" target="_blank" rel="noopener noreferrer" className="footer__link">OLIVIA JACK</a>
          <span className="footer__divider"> — </span>
          READ FULL HYDRA DOCUMENTATION: <a href="https://hydra.ojack.xyz/docs/" target="_blank" rel="noopener noreferrer" className="footer__link">DOCS</a> / <a href="https://hydra.ojack.xyz/functions/" target="_blank" rel="noopener noreferrer" className="footer__link">FUNCTIONS</a>
        </span>
      </div>
    </footer>
  );
}
