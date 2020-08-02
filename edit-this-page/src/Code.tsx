// @jsx jsx
import { Box, Stack, Flex } from 'layout-kit-react'
import Highlight, { defaultProps } from 'prism-react-renderer'
import prismTheme from 'prism-react-renderer/themes/nightOwlLight'
import React, { useCallback } from 'react'
import Editor from 'react-simple-code-editor'
import { css, jsx } from '@emotion/core'

jsx

const CODE_FONT = `'Fira code', 'Fira Mono', monospace`

export const Code = ({
    value = '',
    onChange = (x) => x,
    style = {},
    ...rest
}) => {
    // console.log({rest, live})
    const language = 'tsx'

    const highlightCode = useCallback(
        (code) => {
            return (
                <Highlight
                    {...defaultProps}
                    theme={prismTheme}
                    code={code}
                    language={language}
                >
                    {({
                        className,
                        // style,
                        tokens,
                        getLineProps,
                        getTokenProps,
                    }) => (
                        <Box
                            flexShrink={0}
                            // direction='column'
                            // spacing='0'
                            // p='20px'
                            // pt='30px'
                            borderRadius='8px'
                            as='pre'
                            fontFamily={CODE_FONT}
                            // fontSize='0.9em'
                            // style={{ ...style }}
                            // overflowX='auto'
                            fontWeight='500'
                            className={className}
                            style={style}
                            {...rest}
                        >
                            {tokens.map((line, i) => (
                                <div
                                    key={i}
                                    {...getLineProps({ line, key: i })}
                                >
                                    <Box
                                        d='inline-block'
                                        position='absolute'
                                        left='0px'
                                        textAlign='right'
                                        minW='40px'
                                        opacity={0.4}
                                        pr='40px'
                                        pl='20px'
                                    >
                                        {i + 1}
                                    </Box>
                                    {line.map((token, key) => (
                                        <span
                                            key={key}
                                            {...getTokenProps({ token, key })}
                                        />
                                    ))}
                                </div>
                            ))}
                        </Box>
                    )}
                </Highlight>
            )
        },
        [value, onChange],
    )

    return (
        <Stack
            // shadow='sm'
            overflowX='auto'
            bg='gray.50'
            align='stretch'
            borderRadius='8px'
            css={css`
                textarea {
                    border: none;
                    overflow: auto;
                    outline: none;

                    -webkit-box-shadow: none;
                    -moz-box-shadow: none;
                    box-shadow: none;
                    resize: none; /*remove the resize handle on the bottom right*/
                }
            `}
            {...rest}
        >
            <Editor
                value={value}
                padding={60}
                highlight={highlightCode}
                onValueChange={onChange}
                style={{
                    whiteSpace: 'pre',
                    width: '100%',
                    // overflowX: 'auto',
                    margin: '-60px 0',
                    fontFamily: CODE_FONT,
                    ...style,
                }}
            />
        </Stack>
    )
}
