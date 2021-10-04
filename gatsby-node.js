/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 */
// You can delete this file if you're not using it

/**
 * You can uncomment the following line to verify that
 * your plugin is being loaded in your site.
 *
 * See: https://www.gatsbyjs.com/docs/creating-a-local-plugin/#developing-a-local-plugin-that-is-outside-your-project
 */
const { ApolloClient } = require("apollo-client")
const { InMemoryCache } = require("apollo-cache-inmemory")
const { split } = require("apollo-link")
const { HttpLink } = require("apollo-link-http")
const { WebSocketLink } = require("apollo-link-ws")
const { getMainDefinition } = require("apollo-utilities")
const fetch = require("node-fetch")
const gql = require("graphql-tag")
const WebSocket = require("ws")

const POST_NODE_TYPE = `Post`
const AUTHOR_NODE_TYPE = `Author`

const client = new ApolloClient({
  link: split(
    ({ query }) => {
      const definition = getMainDefinition(query)
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      )
    },
    new WebSocketLink({
      uri: `ws://localhost:4000`,
      // or `ws://gatsby-source-plugin-api.glitch.me/`
      options: {
        reconnect: true,
      },
      webSocketImpl: WebSocket,
    }),
    new HttpLink({
      uri: "http://localhost:4000",
      // or `https://gatsby-source-plugin-api.glitch.me/`
      fetch,
    })
  ),
  cache: new InMemoryCache(),
})

exports.onPreInit = () => console.log("Loaded gatsby-starter-plugin")

exports.sourceNodes = async ({
  actions,
  createContentDigest,
  createNodeId,
  getNodesByType,
}) => {
  const { createNode } = actions

  const { data } = await client.query({
    query: gql`
      query {
        posts {
          id
          description
          slug
          imgUrl
          imgAlt
          author {
            id
            name
          }
        }
        authors {
          id
          name
        }
      }
    `,
  })

  // Recurse through data and create Gatsby nodes.
  data.posts.forEach(post =>
    createNode({
      ...post,
      id: createNodeId(`${POST_NODE_TYPE}-${post.id}`),
      parent: null,
      children: [],
      internal: {
        type: POST_NODE_TYPE,
        content: JSON.stringify(post),
        contentDigest: createContentDigest(post),
      },
    })
  )
  data.authors.forEach(author =>
    createNode({
      ...author,
      id: createNodeId(`${AUTHOR_NODE_TYPE}-${author.id}`),
      parent: null,
      children: [],
      internal: {
        type: AUTHOR_NODE_TYPE,
        content: JSON.stringify(author),
        contentDigest: createContentDigest(author),
      },
    })
  )

  return
}
