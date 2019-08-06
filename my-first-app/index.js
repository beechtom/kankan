/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */

const CONFIG_PATH = 'config.yml'

async function getProjectColumn(config, context) {
  // Request a list of project boards
  let projects = await context.github.projects.listForRepo({
    owner: context.payload.repository.owner.login,
    repo:  context.payload.repository.name
  })

  // Find the project board that matches the config setting
  let projectId = projects.data.filter(project => {
    return project.name === config.board
  })[0].id

  // Request a list of columns for the project
  let columns = await context.github.projects.listColumns({
    project_id: projectId
  })

  // Find the column that matches the config setting
  let columnId = columns.data.filter(column => {
    return column.name === config.column
  })[0].id

  return columnId
}

module.exports = app => {
  // Adds issues to the project board
  app.on('issues.opened', async context => {
    // Load the app config
    const config = await context.config(CONFIG_PATH)
    
    // Request the column id based on the config
    columnId = await getProjectColumn(config.issues, context)

    // Add the new issue to the appropriate column
    await context.github.projects.createCard({
      column_id: columnId,
      content_id: context.payload.issue.id,
      content_type: 'Issue'
    })
  })

  // Adds pull requests to the project board
  app.on('pull_request.opened', async context => {
    // Load the app config
    const config = await context.config(CONFIG_PATH)

    // Request the column id based on the config
    columnId = await getProjectColumn(config.pulls, context)

    // Add the new pull request to the appropriate column
    await context.github.projects.createCard({
      column_id: columnId,
      content_id: context.payload.pull_request.id,
      content_type: 'PullRequest'
    })
  })
}
