import clsx from "clsx";

const Button = ({ id, title, rightIcon, leftIcon, containerClass, href }) => {
  const classes = clsx(
    "group relative z-10 w-fit cursor-pointer overflow-hidden rounded-full bg-violet-50 px-7 py-3 text-black no-underline inline-block",
    containerClass
  );

  const inner = (
    <>
      {leftIcon}
      <span className="relative inline-flex overflow-hidden font-general text-xs uppercase">
        <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
          {title}
        </div>
        <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
          {title}
        </div>
      </span>
      {rightIcon}
    </>
  );

  if (href) {
    return (
      <a id={id} href={href} target={href.startsWith("http") || href.startsWith("mailto") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <button id={id} className={classes}>
      {inner}
    </button>
  );
};

export default Button;
