/** GraphQL documents used by the admin panel. Kept apart from the controller logic. */

export const PROFILE_QUERY = `
  query AdminProfile {
    profile {
      id
      name
      headline
      description
      email
      location
      avatarUrl
      links { id label url kind sortOrder }
      skills { id name category level sortOrder }
      experiences {
        id company position startDate endDate location summary achievements sortOrder
      }
      projects {
        id name description url repositoryUrl sortOrder
        technologies { id name }
      }
    }
  }
`;

export const ME_QUERY = `query Me { me { id email name } }`;

export const LOGIN = `
  mutation Login($input: LoginInput!) {
    login(input: $input) { accessToken admin { id email name } }
  }
`;

export const UPDATE_PROFILE = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) { id }
  }
`;

export const CREATE_LINK = `
  mutation CreateLink($input: CreateSocialLinkInput!) {
    createSocialLink(input: $input) { id }
  }
`;

export const DELETE_LINK = `mutation DeleteLink($id: ID!) { deleteSocialLink(id: $id) }`;

export const CREATE_SKILL = `
  mutation CreateSkill($input: CreateSkillInput!) {
    createSkill(input: $input) { id }
  }
`;

export const UPDATE_SKILL = `
  mutation UpdateSkill($id: ID!, $input: UpdateSkillInput!) {
    updateSkill(id: $id, input: $input) { id }
  }
`;

export const DELETE_SKILL = `mutation DeleteSkill($id: ID!) { deleteSkill(id: $id) }`;

export const CREATE_EXPERIENCE = `
  mutation CreateExperience($input: CreateExperienceInput!) {
    createExperience(input: $input) { id }
  }
`;

export const UPDATE_EXPERIENCE = `
  mutation UpdateExperience($id: ID!, $input: UpdateExperienceInput!) {
    updateExperience(id: $id, input: $input) { id }
  }
`;

export const DELETE_EXPERIENCE = `mutation DeleteExperience($id: ID!) { deleteExperience(id: $id) }`;

export const CREATE_PROJECT = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) { id }
  }
`;

export const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) { id }
  }
`;

export const DELETE_PROJECT = `mutation DeleteProject($id: ID!) { deleteProject(id: $id) }`;
