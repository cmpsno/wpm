#include <iostream>
int main() { int score; std::cin >> score; char grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'; std::cout << grade << "\n"; }
