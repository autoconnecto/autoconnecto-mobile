import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "ap-south-1_CPtlHYBDR",
      userPoolClientId: "38rqa7rj7ra7fd7iloubq6siu9",
    },
  },
});
