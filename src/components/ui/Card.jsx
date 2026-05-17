/* This code fixed By Tg:@ImxCodex */
import { classNames } from '../../utils/helpers';

const Card = ({ children, className = '', glowing = false }) => (
  <div
    className={classNames(
      'bg-slate-900/50 border border-white/[0.05] rounded-[24px] backdrop-blur-xl shadow-lg',
      glowing && 'shadow-blue-900/20',
      className
    )}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={classNames('px-6 py-4 border-b border-slate-800', className)}>
    {children}
  </div>
);

const CardBody = ({ children, className = '' }) => (
  <div className={classNames('px-6 py-4', className)}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={classNames('px-6 py-4 border-t border-slate-800', className)}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
