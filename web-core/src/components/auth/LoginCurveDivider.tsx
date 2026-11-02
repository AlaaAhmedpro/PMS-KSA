/** منحنى الفاصل — مسار واحد للتعبئة والخط */
export const LOGIN_CURVE_PATH = "M 0 0 C 76 210, 76 790, 0 1000";
export const LOGIN_CURVE_VIEWBOX = "0 0 80 1000";
/** يسار المنحنى — objectBoundingBox داخل حاوية الـ seam */
export const LOGIN_CURVE_CLIP_PATH = "M 0,0 C 0.95,0.21 0.95,0.79 0,1 L 0,1 L 0,0 Z";
/** يمين المنحنى — objectBoundingBox داخل حاوية خلفية الـ hero */
export const LOGIN_HERO_OVERLAY_CLIP_PATH = "M 0,0 C 0.08,0.21 0.08,0.79 0,1 L 1,1 L 1,0 Z";

export function LoginCurveDivider() {
  return (
    <>
      <svg className="login-page__clip-defs" aria-hidden width="0" height="0">
        <defs>
          <clipPath id="loginSeamClip" clipPathUnits="objectBoundingBox">
            <path d={LOGIN_CURVE_CLIP_PATH} />
          </clipPath>
          <clipPath id="loginHeroOverlayClip" clipPathUnits="objectBoundingBox">
            <path d={LOGIN_HERO_OVERLAY_CLIP_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div className="login-page__left-base" aria-hidden>
        <div className="login-page__left-base-pinstripes" />
      </div>

      <div className="login-page__seam" aria-hidden>
        <div className="login-page__seam-fill">
          <div className="login-page__left-base-pinstripes" />
        </div>

        <svg viewBox={LOGIN_CURVE_VIEWBOX} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="loginCurveGlow" x="-80%" y="-3%" width="260%" height="106%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={LOGIN_CURVE_PATH}
            fill="none"
            stroke="#c4ff00"
            strokeWidth="2.75"
            filter="url(#loginCurveGlow)"
          />
          <path d={LOGIN_CURVE_PATH} fill="none" stroke="#c4ff00" strokeWidth="1.75" />
          <path d={LOGIN_CURVE_PATH} fill="none" stroke="#f4ffc8" strokeWidth="0.65" opacity="0.85" />
        </svg>
      </div>
    </>
  );
}
