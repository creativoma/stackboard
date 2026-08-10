import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'ghost'
    | 'icon'
    | 'onBoard'
    | 'onBoardDashed'
export type ButtonSize = 'default' | 'sm'

const variantClass: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    destructive: 'btn-destructive',
    ghost: 'btn-ghost',
    icon: 'btn-icon',
    onBoard: 'btn-onboard',
    onBoardDashed: 'btn-onboard btn-onboard--dashed',
}

type ButtonOwnProps = {
    variant?: ButtonVariant
    size?: ButtonSize
    className?: string
}

type ButtonAsButton = ButtonOwnProps &
    Omit<ComponentPropsWithoutRef<'button'>, keyof ButtonOwnProps> & {
        href?: undefined
    }

type ButtonAsLink = ButtonOwnProps &
    Omit<ComponentPropsWithoutRef<typeof Link>, keyof ButtonOwnProps> & {
        href: string
        external?: boolean
    }

export type ButtonProps = ButtonAsButton | ButtonAsLink

function getClassName(
    variant: ButtonVariant,
    size: ButtonSize,
    className?: string
) {
    return [
        variantClass[variant],
        size === 'sm' ? 'btn--default' : null,
        className,
    ]
        .filter(Boolean)
        .join(' ')
}

export function Button(props: ButtonProps) {
    const {
        variant = 'primary',
        size = 'default',
        className,
        children,
        ...rest
    } = props

    const classes = getClassName(variant, size, className)

    if ('href' in props && props.href !== undefined) {
        const { href, external, ...linkRest } = rest as Omit<
            ButtonAsLink,
            keyof ButtonOwnProps | 'children'
        >
        if (external) {
            return (
                <a href={href} className={classes} {...linkRest}>
                    {children}
                </a>
            )
        }
        return (
            <Link href={href} className={classes} {...linkRest}>
                {children}
            </Link>
        )
    }

    const buttonRest = rest as Omit<
        ButtonAsButton,
        keyof ButtonOwnProps | 'children'
    >
    return (
        <button type="button" className={classes} {...buttonRest}>
            {children}
        </button>
    )
}
