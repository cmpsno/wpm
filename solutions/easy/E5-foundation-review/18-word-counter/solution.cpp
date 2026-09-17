#include <cctype>
#include <iostream>
#include <string>
int main() { std::string line; std::getline(std::cin, line); int words = 0, characters = 0; bool inWord = false; for (unsigned char c : line) { if (c != ' ') ++characters; if (!std::isspace(c) && !inWord) { ++words; inWord = true; } else if (std::isspace(c)) inWord = false; } std::cout << "Words: " << words << "\nCharacters: " << characters << "\n"; }
