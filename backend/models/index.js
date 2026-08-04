import { sequelize } from '../config/database.js';
import { initUser, User } from './User.js';
import { initTeam, Team } from './Team.js';
import { initTeamMember, TeamMember } from './TeamMember.js';
import { initRepository, Repository } from './Repository.js';
import { initPullRequest, PullRequest } from './PullRequest.js';
import { initWebhookDelivery, WebhookDelivery } from './WebhookDelivery.js';

initUser(sequelize);
initTeam(sequelize);
initTeamMember(sequelize);
initRepository(sequelize);
initPullRequest(sequelize);
initWebhookDelivery(sequelize);

User.belongsToMany(Team, { through: TeamMember, foreignKey: 'userId', otherKey: 'teamId' });
Team.belongsToMany(User, { through: TeamMember, foreignKey: 'teamId', otherKey: 'userId' });
User.hasMany(TeamMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
TeamMember.belongsTo(User, { foreignKey: 'userId' });
Team.hasMany(TeamMember, { foreignKey: 'teamId', onDelete: 'CASCADE' });
TeamMember.belongsTo(Team, { foreignKey: 'teamId' });
Team.hasMany(Repository, { foreignKey: 'teamId', onDelete: 'CASCADE' });
Repository.belongsTo(Team, { foreignKey: 'teamId' });
Repository.hasMany(PullRequest, { foreignKey: 'repositoryId', onDelete: 'CASCADE' });
PullRequest.belongsTo(Repository, { foreignKey: 'repositoryId' });

export { sequelize, User, Team, TeamMember, Repository, PullRequest, WebhookDelivery };
