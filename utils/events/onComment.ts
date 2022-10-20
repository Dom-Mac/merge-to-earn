import { IssueCommentEvent } from "@octokit/webhooks-types"
import { controllerCheck } from "@utils/controllerCheck"
import fetcher from "@utils/fetcher"
import { onPrOpenedMessage, onSlicesRequestMessage } from "@utils/ghMessages"
import { createComment, editComment } from "@utils/ghHandler"

export default async function onComment(payload: IssueCommentEvent) {
  console.log("on comment ---------")
  // TODO change slicer and safe
  const slicerId = "1"
  const safeAddress = "0xA8a3763a206D99d3b8bEc94d336F43FdEC3fC6F8"

  const text: string = payload.comment.body
  const requiredText = "### Slice distribution request"
  const splitText = text.split("-")
  let botMessage: string

  if (splitText[0].trim() === requiredText) {
    const author = payload.issue.user.login
    // TODO use octokit request for private repos
    const comments = await fetcher(payload.issue.comments_url)
    const pinnedBotComment = comments.find(
      (el: any) =>
        el.user.login === "merge-to-earn[bot]" &&
        el.body.includes(`### 👋 Gm @${author}`)
    )

    // Check if comment's user is the PR owner
    if (payload.comment.user.id === payload.issue.user.id) {
      // Set bot message to fire in create comment
      // m is defined based on success
      const [m, success, totalSlices] = await onSlicesRequestMessage(
        slicerId,
        splitText
      )
      botMessage = m
      // TODO: Add type checks on addresses and sliceAmounts
      // Edit first bot comment
      if (success) {
        const newFirstMessage =
          onPrOpenedMessage(author, slicerId, totalSlices) +
          "\n\n --- \n\n" +
          botMessage

        // If there is a pinned comment
        if (pinnedBotComment) {
          editComment(
            payload.repository.owner.login,
            payload.repository.name,
            pinnedBotComment.id,
            newFirstMessage,
            payload.installation.id
          )
        } else {
          // await controllerCheck(slicerId, safeAddress)
          createComment(
            payload.repository.owner.login,
            payload.repository.name,
            payload.issue.number,
            newFirstMessage,
            payload.installation.id
          )
        }
      }
    } else {
      botMessage =
        "User not authorized, only the PR owner can request slice distributions"
    }
    if (
      pinnedBotComment ||
      !botMessage.includes("### Upcoming slice distribution:")
    ) {
      createComment(
        payload.repository.owner.login,
        payload.repository.name,
        payload.issue.number,
        botMessage,
        payload.installation.id
      )
    }
  }
}
