import { transformFromAstSync, parse } from '@babel/core'
import { Visitor } from '@babel/traverse'
import jsxSyntaxPlugin from 'babel-plugin-syntax-jsx'
import minimatch from 'minimatch'
import path from 'path'
import fs from 'fs'
import * as BabelTypes from '@babel/types'
import { getGitConfigSync, getRepoRoot } from 'get-git-config'
import { execSync } from 'child_process'

export type PluginOptions = {
    values: { value: string; newValue: string; literal?: boolean }[]
}

const debug = console.log

export type InjectedParams = {
    editThisPageFilePath?: string
    editThisPageBranch?: string
    editThisPageGitRemote?: string
    editThisPageSourceCode?: string
}

export const babelPlugin = (
    babel: { types: typeof BabelTypes; template; parse; transformFromAstSync },
    { editableFiles = '**' },
): { visitor: Visitor<any>; inherits } => {
    const { types: t, template } = babel

    return {
        inherits: jsxSyntaxPlugin,
        visitor: {
            Program: {
                enter(p, state) {
                    const sourceCode: string = state.file.code
                    const filePath = state.file.opts.filename || ''
                    const root = getRepoRoot()
                    if (!root) {
                        throw new Error(
                            `cannot find the .git directory, edit-this-page plugin only works with git repos`,
                        )
                    }
                    const relativePathToRepo = path.relative(root, filePath)
                    const relativePathToBabel = path.relative(
                        process.cwd(),
                        filePath,
                    )
                    // console.log({ relativePath })
                    if (!minimatch(relativePathToBabel, editableFiles)) {
                        // debug('skipping')
                        return
                    }

                    const remote = getGitConfigSync('.')?.remote
                    const gitRemote =
                        remote?.origin?.url ||
                        remote?.[Object.keys(remote)[0]]?.url ||
                        ''
                    const branch = getCurrentBranch()

                    // TODO add additional attributes to the button props taken from a config file, like target branch ...
                    const toInject: InjectedParams = {
                        editThisPageFilePath: relativePathToRepo,
                        editThisPageGitRemote: gitRemote,
                        editThisPageSourceCode: sourceCode,
                        editThisPageBranch: branch,
                    }

                    // babel source code is the transformed markdown, we need the original source code
                    // console.log(path.extname(filePath))
                    if (
                        ['.md', '.mdx'].includes(path.extname(filePath))
                    ) {
                        toInject.editThisPageSourceCode = fs
                            .readFileSync(filePath)
                            .toString()
                    }

                    const codeToInsert = `
                    if (typeof window !== 'undefined') {
                        const toInject = ${JSON.stringify(toInject)};
                        for (let k in toInject) {
                            window[k] = toInject[k];
                        }
                    }\n`

                    // this.file.code = codeToInsert + '\n' + this.file.code
                    debug('adding top level source code variable')
                    const parsed = babel.parse(codeToInsert, {
                        filename: '',
                    })
                    // console.log(codeToInsert)
                    p.unshiftContainer('body', parsed.program.body[0])
                },
            },
        },
    }
}

export function getCurrentBranch() {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {})
    return branch.toString().trim()
}
