/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */

const CONFIG_PATH = 'config.yml'

async function getProjectColumn(boardName, columnName, context) {
  // Request a list of project boards
  let projects = await context.github.projects.listForRepo({
    owner: context.payload.repository.owner.login,
    repo:  context.payload.repository.name
  })

  // Find the project board that matches the config setting
  let projectId = projects.data.filter(project => {
    return project.name === boardName
  })[0].id

  // Request a list of columns for the project
  let columns = await context.github.projects.listColumns({
    project_id: projectId
  })

  console.log(columns)

  // Find the column that matches the config setting
  let columnId = columns.data.filter(column => {
    return column.name === columnName
  })[0].id

  return columnId
}

async function updateIssueTitle(context) {
  let payload = {
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    issue_number: context.payload.issue.number,
    title: `(BOLT-${context.payload.issue.number}) ${context.payload.issue.title}`,
    number: context.payload.issue.number
  }

  await context.github.issues.update(payload)
}

async function updatePullRequestTitle(context) {
  let payload = {
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    pull_number: context.payload.pull_request.number,
    title: `(BOLT-${context.payload.pull_request.number}) ${context.payload.pull_request.title}`,
    number: context.payload.pull_request.number
  }

  await context.github.pullRequests.update(payload)
}

module.exports = app => {
  // Adds issues to the project board
  app.on('issues.opened', async context => {
    // Load the app config
    const config = await context.config(CONFIG_PATH)

    // Update the issue title
    // await updateIssueTitle(context)
    
    // Request the column id based on the config
    columnId = await getProjectColumn(config.project, config.add.issues, context)

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

    // Update the pull title
    // await updatePullRequestTitle(context)

    // Request the column id based on the config
    columnId = await getProjectColumn(config.project, config.add.pulls, context)

    // Add the new pull request to the appropriate column
    await context.github.projects.createCard({
      column_id: columnId,
      content_id: context.payload.pull_request.id,
      content_type: 'PullRequest'
    })
  })

  // Updates labels when a card is moved
  app.on('project_card.moved', async context => {
    // Load the project card label config
    const config = (await context.config(CONFIG_PATH)).label

    // console.log(context)

    // Get a list of columns and map their IDs to their names
    // { column.id: column.name }
    columns = {};

    (await context.github.projects.listColumns({
      project_id: context.payload.project_card.project_url.split('/').slice(-1)[0]
    })).data
      .map(column => columns[column.id] = column.name)

    // Figure out the issue number
    issueNumber = context.payload.project_card.content_url.split('/').slice(-1)[0]

    if (context.payload.changes) {
      // Extract the name of the old column
      oldColumnName = columns[context.payload.changes.column_id.from]

      // Remove the label from the previous column
      try {
        await context.github.issues.removeLabel({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          number: issueNumber,
          name: config[oldColumnName]
        })
      } catch(err) {
        console.log(`${error.name}: ${error.code} ${error.status}`)
      }
    }

    // Extract the name of the new column
    newColumnName = columns[context.payload.project_card.column_id]

    // Add the label from the new column
    await context.github.issues.addLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: issueNumber,
      labels: {
        labels: [config[newColumnName]]
      }
    })
  })
}
