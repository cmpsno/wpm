#include <cctype>
#include <iostream>
#include <string>
int main() { std::string password; std::getline(std::cin, password); bool digit = false, upper = false, symbol = false; for (unsigned char c : password) { digit |= std::isdigit(c); upper |= std::isupper(c); symbol |= !std::isalnum(c); } int checks = (password.size() >= 8) + digit + upper + symbol; std::cout << (checks <= 1 ? "Weak" : checks == 2 ? "Medium" : "Strong") << "\n"; }
