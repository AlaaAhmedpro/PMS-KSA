import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Atlantis light preset — blue primary on a lavender canvas.
 */
export const PmsPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '6px',
      xl: '6px',
    },
    blue: {
      50: '#e8efff',
      100: '#d5e2ff',
      200: '#b3c9fb',
      300: '#86a8f6',
      400: '#5d8af2',
      500: '#3b6fe8',
      600: '#2f5ed0',
      700: '#274eae',
      800: '#21428f',
      900: '#1c366f',
      950: '#122044',
    },
    stone: {
      50: '#f4f6fb',
      100: '#eef1f8',
      200: '#e4e8f2',
      300: '#c9d0e0',
      400: '#9aa3b8',
      500: '#7a8499',
      600: '#5d667a',
      700: '#3e475c',
      800: '#1f2a44',
      900: '#151c2e',
      950: '#0d1220',
    },
  },
  semantic: {
    transitionDuration: '0.15s',
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
    formField: {
      paddingX: '0.75rem',
      paddingY: '0.4375rem',
      borderRadius: '{border.radius.sm}',
      shadow: 'none',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.500}',
      offset: '1px',
      shadow: 'none',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{stone.50}',
          100: '{stone.100}',
          200: '{stone.200}',
          300: '{stone.300}',
          400: '{stone.400}',
          500: '{stone.500}',
          600: '{stone.600}',
          700: '{stone.700}',
          800: '{stone.800}',
          900: '{stone.900}',
          950: '{stone.950}',
        },
        primary: {
          color: '{blue.500}',
          contrastColor: '#ffffff',
          hoverColor: '{blue.600}',
          activeColor: '{blue.700}',
        },
        highlight: {
          background: '{blue.50}',
          focusBackground: '{blue.100}',
          color: '{blue.700}',
          focusColor: '{blue.800}',
        },
        text: {
          color: '{stone.800}',
          hoverColor: '{stone.900}',
          mutedColor: '{stone.500}',
          hoverMutedColor: '{stone.600}',
        },
        formField: {
          background: '#ffffff',
          disabledBackground: '{stone.100}',
          filledBackground: '{stone.50}',
          filledHoverBackground: '{stone.50}',
          filledFocusBackground: '{stone.50}',
          borderColor: '{stone.200}',
          hoverBorderColor: '{stone.400}',
          focusBorderColor: '{blue.500}',
          color: '{stone.800}',
          disabledColor: '{stone.500}',
          placeholderColor: '{stone.500}',
          floatLabelColor: '{stone.500}',
          floatLabelFocusColor: '{blue.600}',
          floatLabelActiveColor: '{stone.500}',
          iconColor: '{stone.500}',
          shadow: 'none',
        },
        content: {
          background: '#ffffff',
          hoverBackground: '{stone.50}',
          borderColor: '{stone.200}',
          color: '{stone.800}',
          hoverColor: '{stone.900}',
        },
        overlay: {
          select: {
            background: '#ffffff',
            borderColor: '{stone.200}',
            color: '{stone.800}',
            shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
          },
          popover: {
            background: '#ffffff',
            borderColor: '{stone.200}',
            color: '{stone.800}',
            shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
          },
          modal: {
            background: '#ffffff',
            borderColor: '{stone.200}',
            color: '{stone.800}',
            shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
            borderRadius: '{border.radius.md}',
            padding: '1rem',
          },
          navigation: {
            shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
          },
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '{border.radius.md}',
        paddingX: '1rem',
        paddingY: '0.5rem',
        label: {
          fontWeight: '600',
        },
      },
    },
    inputtext: {
      root: {
        borderRadius: '{border.radius.md}',
        shadow: 'none',
      },
    },
    select: {
      root: {
        borderRadius: '{border.radius.md}',
        shadow: 'none',
      },
      overlay: {
        borderRadius: '{border.radius.md}',
        shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
      },
    },
    textarea: {
      root: {
        borderRadius: '{border.radius.sm}',
        shadow: 'none',
      },
    },
    datatable: {
      headerCell: {
        padding: '0.625rem 0.75rem',
      },
      bodyCell: {
        padding: '0.5rem 0.75rem',
      },
    },
    dialog: {
      root: {
        borderRadius: '{border.radius.md}',
        shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
      },
    },
    tabs: {
      tab: {
        padding: '0.625rem 0.875rem',
        fontWeight: '500',
      },
      activeBar: {
        height: '2px',
        background: '{blue.500}',
      },
    },
    tag: {
      root: {
        fontSize: '0.75rem',
        fontWeight: '500',
        padding: '0.125rem 0.5rem',
        borderRadius: '{border.radius.sm}',
      },
    },
    paginator: {
      root: {
        padding: '0.5rem 0.75rem',
        borderRadius: '{border.radius.md}',
      },
      navButton: {
        borderRadius: '{border.radius.sm}',
        width: '2rem',
        height: '2rem',
      },
    },
    datepicker: {
      panel: {
        borderRadius: '{border.radius.md}',
        shadow: '0 1px 3px rgba(45, 49, 66, 0.12)',
      },
    },
    toast: {
      root: {
        borderRadius: '{border.radius.md}',
        width: '22rem',
      },
    },
    card: {
      root: {
        borderRadius: '{border.radius.md}',
        shadow: 'none',
      },
    },
  },
});
