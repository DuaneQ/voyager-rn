import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 16,
    color: '#333',
  },
  welcomeBox: {
    backgroundColor: 'rgba(25, 118, 210, 0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(25, 118, 210, 0.12)',
    padding: 12,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 11,
    marginTop: 2,
  },
  button: {
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  primaryButton: {
    backgroundColor: '#1976d2',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  linkSmall: {
    color: '#1976d2',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 8,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signinText: {
    color: '#666',
    fontSize: 14,
  },
  signinLink: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  backContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  backLink: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  /* Password toggle layout */
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  passwordToggle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },
  passwordToggleText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 13,
  },
});
