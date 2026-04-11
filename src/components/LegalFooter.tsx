import React from 'react';
import BrandLogo from './BrandLogo';

const LegalFooter = () => {
  const currentYear = new Date().getFullYear();
  const links = [
    { name: 'About Us', href: 'https://www.eddesk.in/about' },
    { name: 'Contact Us', href: 'https://www.eddesk.in/contact' },
    { name: 'Terms & Conditions', href: 'https://www.eddesk.in/terms' },
    { name: 'Privacy Policy', href: 'https://www.eddesk.in/privacy' },
    { name: 'Refund & Cancellation', href: 'https://www.eddesk.in/refund-cancellation' },
  ];

  return (
    <footer className="w-full py-12 px-6 mt-auto border-t border-gray-100 bg-[#fefefe]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand Info */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
               <BrandLogo className="w-6 h-6" />
               <span className="text-sm font-black tracking-tighter text-gray-900 uppercase">EdDesk</span>
            </div>
            <p className="text-[12px] text-gray-400 font-medium text-center md:text-left">
              The complete ecosystem for modern education management. <br />
              Empowering institutions with smart automation.
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-bold text-gray-500 hover:text-[#F54927] transition-all duration-300 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#F54927] transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
          <div className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">
            &copy; {currentYear} EdDesk Platform &bull; A Product of <a href="https://tech.sacglobe.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#F54927] transition-colors">SAC Globe Tech</a>
          </div>
          <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            Secure Payments by Razorpay
          </div>
        </div>

      </div>
    </footer>
  );
};

export default LegalFooter;

