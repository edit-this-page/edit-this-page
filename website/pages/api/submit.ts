import { Octokit } from '@octokit/rest'
import { SubmitArgs } from 'edit-this-page/src/submit'
import { NextApiHandler } from 'next/types'
import _parseGithubUrl from 'parse-github-url'
import { GITHUB_TOKEN } from '../../constants'
import * as uuid from 'uuid'
import { pretty } from '../../support'

const handler: NextApiHandler = async (req, res) => {
    const { filePath, changedCode, githubUrl }: SubmitArgs = req.body
    const branchFrom = 'master' // TODO branchfrom
    console.log(`opening pull request at '${githubUrl}' for file '${filePath}'`)
    const octokit = new Octokit({ auth: GITHUB_TOKEN })
    // octokit.git.createBlob({
    //     owner,
    //     repo,

    // })
    const { owner, repo } = parseGithubUrl(githubUrl)

    // forkRes.

    // create branch
    const newBranchName = uuid.v4()

    const forkRes = await createForkAndBranch(octokit, {
        githubUrl,
        newBranchName,
    })

    const prRes = await createPr(octokit, {
        githubUrl,
        branchRef: forkRes.branchRef,
        prCreator: await getMyLogin(octokit),
        title: `Changes for '${filePath}'`,
        // TODO get the current branch or use babel config
        baseBranch: 'master',
    })

    // console.log(data)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.json({})
}

// TODO memoize this function
export async function getMyLogin(octokit: Octokit) {
    const { data } = await octokit.users.getAuthenticated()
    return data.login
}

export async function createForkAndBranch(
    octokit: Octokit,
    { githubUrl, newBranchName },
) {
    const { owner, repo } = parseGithubUrl(githubUrl)

    console.log(`creating fork`)
    const forkRes = await octokit.repos.createFork({
        owner,
        repo,
    })
    pretty(forkRes.data)

    console.log(`getting last commits`)
    let response = await octokit.repos.listCommits({
        owner,
        repo,
        // sha: fromBranch,
        per_page: 1,
    })
    const latestCommitSha = response.data[0].sha

    console.log(`creating branch`)
    const branchRes = await octokit.git.createRef({
        owner: forkRes.data.owner.login,
        repo: forkRes.data.name,
        ref: `refs/heads/${newBranchName}`,
        sha: latestCommitSha,
    })

    return { ...forkRes.data, branchRef: branchRes.data.ref }
}

export async function createPr(
    octokit: Octokit,
    { githubUrl, title, body = '', branchRef, prCreator = '', baseBranch },
) {
    const { owner, repo } = parseGithubUrl(githubUrl)

    await octokit.pulls.create({
        owner,
        repo,
        title,
        /**
         * The name of the branch where your changes are implemented. For cross-repository pull requests in the same network, namespace `head` with a user like this: `username:branch`.
         */
        head: prCreator ? `${prCreator}:${branchRef}` : branchRef,
        /**
         * The name of the branch you want the changes pulled into. This should be an existing branch on the current repository. You cannot submit a pull request to one repository that requests a merge to a base of another repository.
         */

        base: baseBranch,
        body,
        maintainer_can_modify: true,
    })
}

export default handler

export function parseGithubUrl(githubUrl): { repo; owner } {
    if (!githubUrl) {
        throw new Error(`cannot parse null github url `)
    }
    const parsedUrl = _parseGithubUrl(githubUrl)
    if (!parsedUrl) {
        throw new Error('cannot parse github url ' + githubUrl)
    }
    const { owner, name: repo } = parsedUrl
    if (!owner || !repo) {
        throw new Error('cannot parse github url ' + githubUrl)
    }
    return { repo, owner }
}

export async function commitFiles(
    octokit: Octokit,
    {
        githubUrl,
        tree,
        fromBranch = undefined,
        message,
    }: {
        githubUrl
        fromBranch
        tree: { path; mode: '100644'; content }[] // mode '100644',
        message
    },
) {
    const { owner, repo } = parseGithubUrl(githubUrl)
    console.log('getting latest commit sha & treeSha')
    let response = await octokit.repos.listCommits({
        owner,
        repo,
        sha: fromBranch,
        per_page: 1,
    })
    const latestCommitSha = response.data[0].sha
    const treeSha = response.data[0].commit.tree.sha
    console.log(`commit sha: ${latestCommitSha}, tree sha: ${treeSha}`)

    console.log('creating tree')
    const treeResponse = await octokit.git.createTree({
        owner,
        repo,
        base_tree: treeSha,
        tree,
    })
    const newTreeSha = treeResponse.data.sha

    console.log(`new tree sha: ${newTreeSha}`)

    console.log('creating commit')
    const commitRes = await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: newTreeSha,
        parents: [latestCommitSha],
        // author: {
        //     name: 'containerful',
        //     email: 'apu@martynus.net',
        // },
    })
    const newCommitSha = commitRes.data.sha
    await octokit.git.updateRef({
        owner,
        repo,
        force: true,
        sha: newCommitSha,
        ref: `heads/master`, // sometimes is refs/
    })
    console.log(`new commit sha: ${newCommitSha}`)
    console.log(
        `new commit at 'https://github.com/remorses/testing-github-api/commit/${newCommitSha}'`,
    )
}