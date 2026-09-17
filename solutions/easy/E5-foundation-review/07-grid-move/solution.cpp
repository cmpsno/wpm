#include <iostream>
#include <string>
int main() { int x, y; std::string direction; std::cin >> x >> y >> direction; if (direction == "N") --y; else if (direction == "S") ++y; else if (direction == "E") ++x; else if (direction == "W") --x; std::cout << x << " " << y << "\n"; }
